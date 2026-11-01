<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Events\MessagesRead;
use App\Http\Controllers\Controller;
use App\Http\Requests\ChatHistoryRequest;
use App\Http\Requests\StartConversationRequest;
use App\Models\Application;
use App\Models\Conversation;
use App\Models\Job;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationEmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ChatController extends Controller
{
    /**
     * Danh sách phòng trò chuyện của người dùng hiện tại (FR-08.1, FR-08.4, FR-08.6)
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $conversations = Conversation::where('candidate_id', $userId)
            ->orWhere('employer_id', $userId)
            ->with([
                'candidate:id,name,role',
                'candidate.candidateProfile:id,user_id,avatar',
                'employer:id,name,role',
                'employer.company:id,user_id,name,logo',
                'job:id,title,status,deadline',
                'latestMessage',
            ])
            ->withCount(['messages as unread_count' => fn ($query) => $query
                ->where('sender_id', '!=', $userId)->where('is_read', false)])
            ->orderBy('last_message_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $applications = Application::whereIn('job_id', $conversations->pluck('job_id'))
            ->whereHas('candidateProfile', fn ($query) => $query->whereIn('user_id', $conversations->pluck('candidate_id')))
            ->select(['id', 'job_id', 'candidate_id'])
            ->with('candidateProfile:id,user_id')->get()
            ->keyBy(fn ($application) => $application->job_id.':'.$application->candidateProfile?->user_id);

        $data = $conversations->map(function ($conv) use ($userId, $applications) {
            $isCandidate = (int) $userId === (int) $conv->candidate_id;
            $partner = $isCandidate ? $conv->employer : $conv->candidate;
            $partnerName = $isCandidate
                ? ($conv->employer?->company?->name ?? $conv->employer?->name)
                : $conv->candidate?->name;

            $partnerAvatar = $isCandidate
                ? ($conv->employer?->company?->logo ? '/storage/'.ltrim($conv->employer->company->logo, '/') : null)
                : ($conv->candidate?->candidateProfile?->avatar ? '/storage/'.ltrim($conv->candidate->candidateProfile->avatar, '/') : null);

            $lastMsg = $conv->latestMessage;

            // FR-04.6 & FR-08.6: Duy trì liên lạc khi tin đóng kèm nhãn thông báo phụ
            $isClosed = $conv->job?->status === 'closed';
            $isExpired = $conv->job?->deadline && $conv->job->deadline->toDateString() < now()->toDateString();
            $jobNotice = null;
            if ($isClosed) {
                $jobNotice = 'Tin tuyển dụng đã đóng';
            } elseif ($isExpired) {
                $jobNotice = 'Tin tuyển dụng đã hết hạn';
            }

            return [
                'id' => $conv->id,
                'candidate_id' => $conv->candidate_id,
                'employer_id' => $conv->employer_id,
                'application_id' => $applications->get($conv->job_id.':'.$conv->candidate_id)?->id,
                'job_id' => $conv->job_id,
                'job_title' => $conv->job?->title,
                'job_status' => $conv->job?->status,
                'is_closed' => $isClosed,
                'is_expired' => $isExpired,
                'job_notice' => $jobNotice,
                'unread_count' => (int) $conv->unread_count,
                'partner' => [
                    'id' => $partner?->id,
                    'name' => $partnerName,
                    'role' => $partner?->role,
                    'avatar_url' => $partnerAvatar,
                ],
                'last_message' => $lastMsg ? [
                    'id' => $lastMsg->id,
                    'sender_id' => $lastMsg->sender_id,
                    'message' => $lastMsg->message,
                    'image_url' => $lastMsg->image_url,
                    'is_read' => (bool) $lastMsg->is_read,
                    'read_at' => $lastMsg->read_at?->toIso8601String(),
                    'status_display' => $lastMsg->status_display,
                    'time_display' => $lastMsg->time_display ?? $lastMsg->created_at?->format('H:i'),
                    'created_at' => $lastMsg->created_at?->toIso8601String(),
                ] : null,
                'last_message_at' => $conv->last_message_at?->toIso8601String(),
                'created_at' => $conv->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách cuộc trò chuyện thành công',
            'data' => $data,
        ], 200);
    }

    /**
     * Mở hoặc tạo mới cuộc trò chuyện giữa NTD và Ứng viên (FR-08.1)
     */
    public function startConversation(StartConversationRequest $request): JsonResponse
    {
        $user = $request->user();

        $job = Job::with('company.user')->find($request->job_id);

        if (! $job) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc không tồn tại',
            ], 404);
        }

        if ($user->isCandidate()) {
            $candidateId = $user->id;
            $employerId = (int) ($request->partner_id ?? $job->company?->user_id);

            // Kiểm tra partner_id có phải là NTD sở hữu tin này không
            if (! $job->company || (int) $job->company->user_id !== $employerId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nhà tuyển dụng không quản lý tin tuyển dụng này',
                ], 400);
            }

            $candidateProfile = $user->candidateProfile;
            if (! $candidateProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng hoàn thiện hồ sơ ứng viên trước khi nhắn tin',
                ], 400);
            }

            // FR-08.1: Kiểm tra ứng viên đã nộp đơn vào tin tuyển dụng này chưa
            $hasApplication = Application::where('job_id', $job->id)
                ->where('candidate_id', $candidateProfile->id)
                ->where('status', '!=', 'withdrawn')
                ->exists();

            if (! $hasApplication) {
                return response()->json([
                    'success' => false,
                    'message' => 'Phòng trò chuyện chỉ được tạo khi ứng viên đã nộp hồ sơ vào tin tuyển dụng này',
                ], 400);
            }
        } elseif ($user->isEmployer()) {
            $employerId = $user->id;
            $candidateId = (int) $request->partner_id;

            // Kiểm tra NTD có phải là chủ sở hữu tin này không
            if (! $job->company || (int) $job->company->user_id !== $employerId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền quản lý tin tuyển dụng này',
                ], 403);
            }

            $candidateUser = User::with('candidateProfile')->find($candidateId);
            if (! $candidateUser || ! $candidateUser->isCandidate() || ! $candidateUser->candidateProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy hồ sơ của ứng viên',
                ], 404);
            }

            // FR-08.1: Kiểm tra ứng viên đã nộp đơn vào tin tuyển dụng này chưa
            $hasApplication = Application::where('job_id', $job->id)
                ->where('candidate_id', $candidateUser->candidateProfile->id)
                ->where('status', '!=', 'withdrawn')
                ->exists();

            if (! $hasApplication) {
                return response()->json([
                    'success' => false,
                    'message' => 'Phòng trò chuyện chỉ được tạo khi ứng viên đã nộp hồ sơ vào tin tuyển dụng này',
                ], 400);
            }
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ Nhà tuyển dụng và Ứng viên mới có thể tham gia cuộc trò chuyện',
            ], 403);
        }

        $conversation = Conversation::firstOrCreate([
            'candidate_id' => $candidateId,
            'employer_id' => $employerId,
            'job_id' => $job->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Khởi tạo cuộc trò chuyện thành công',
            'data' => [
                'id' => $conversation->id,
                'candidate_id' => $conversation->candidate_id,
                'employer_id' => $conversation->employer_id,
                'job_id' => $conversation->job_id,
            ],
        ], 200);
    }

    /**
     * Xem lịch sử tin nhắn trong phòng chat (FR-08.4, FR-08.5, FR-08.6)
     */
    public function messages(ChatHistoryRequest $request, $id): JsonResponse
    {
        $userId = $request->user()->id;
        $conversation = Conversation::with('job:id,title,status,deadline')->find($id);

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Cuộc trò chuyện không tồn tại',
            ], 404);
        }

        // FR-08.5: Kiểm tra quyền bảo mật - chỉ thành viên mới được xem
        if ((int) $userId !== (int) $conversation->candidate_id && (int) $userId !== (int) $conversation->employer_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền truy cập vào cuộc trò chuyện này',
            ], 403);
        }

        // FR-08.4: Đánh dấu tất cả tin nhắn đối phương gửi cho mình là "Đã xem" (is_read = 1, read_at = now())
        $unreadMessagesCount = Message::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $userId)
            ->where('is_read', 0)
            ->update([
                'is_read' => 1,
                'read_at' => now(),
            ]);

        if ($unreadMessagesCount > 0) {
            try {
                broadcast(new MessagesRead($conversation->id, $userId))->toOthers();
            } catch (\Throwable $e) {
                // Tiếp tục luồng nếu Reverb socket chưa kết nối
            }
        }

        $perPage = (int) $request->validated('per_page', 50);
        $query = Message::where('conversation_id', $conversation->id)
            ->with(['sender:id,name,role', 'sender.candidateProfile:id,user_id,avatar', 'sender.company:id,user_id,logo']);
        $cursorWindow = $request->boolean('latest') || $request->hasAny(['after_id', 'before_id']);
        if ($cursorWindow) {
            $newer = $request->has('after_id');
            if ($newer) {
                $query->where('id', '>', (int) $request->validated('after_id'));
            } elseif ($request->has('before_id')) {
                $query->where('id', '<', (int) $request->validated('before_id'));
            }
            $window = $query->orderBy('id', $newer ? 'asc' : 'desc')->limit($perPage + 1)->get();
            $hasMore = $window->count() > $perPage;
            $messages = $window->take($perPage);
            if (! $newer) {
                $messages = $messages->reverse();
            }
            $messages = $messages->values();
            $meta = [
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $perPage,
                'total' => $messages->count(),
                'has_more' => $hasMore,
                'oldest_id' => $messages->first()?->id,
                'newest_id' => $messages->last()?->id,
            ];
        } else {
            // Preserve legacy ascending page navigation for existing API clients.
            $messages = $query->orderBy('created_at')->orderBy('id')->paginate($perPage);
            $meta = [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
            ];
        }

        $formatted = $messages->map(function ($msg) {
            $senderAvatar = $msg->sender?->isCandidate()
                ? ($msg->sender?->candidateProfile?->avatar ? '/storage/'.ltrim($msg->sender->candidateProfile->avatar, '/') : null)
                : ($msg->sender?->company?->logo ? '/storage/'.ltrim($msg->sender->company->logo, '/') : null);

            return [
                'id' => $msg->id,
                'conversation_id' => $msg->conversation_id,
                'sender_id' => $msg->sender_id,
                'sender_name' => $msg->sender?->name,
                'sender_avatar_url' => $senderAvatar,
                'message' => $msg->message,
                'image_url' => $msg->image_url,
                'is_read' => (bool) $msg->is_read,
                'read_at' => $msg->read_at?->toIso8601String(),
                'status_display' => $msg->status_display, // "Đã xem" hoặc "Đã gửi" (FR-08.4)
                'time_display' => $msg->time_display ?? $msg->created_at?->format('H:i'), // Định dạng HH:mm (FR-08.4)
                'created_at' => $msg->created_at?->toIso8601String(),
            ];
        });

        $isClosed = $conversation->job?->status === 'closed';
        $isExpired = $conversation->job?->deadline && $conversation->job->deadline->toDateString() < now()->toDateString();
        $jobNotice = null;
        if ($isClosed) {
            $jobNotice = 'Tin tuyển dụng đã đóng';
        } elseif ($isExpired) {
            $jobNotice = 'Tin tuyển dụng đã hết hạn';
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy lịch sử tin nhắn thành công',
            'data' => $formatted,
            'conversation' => [
                'id' => $conversation->id,
                'job_id' => $conversation->job_id,
                'job_title' => $conversation->job?->title,
                'job_status' => $conversation->job?->status,
                'is_closed' => $isClosed,
                'is_expired' => $isExpired,
                'job_notice' => $jobNotice, // FR-08.6: Kèm nhãn thông báo phụ
            ],
            'meta' => $meta,
        ], 200);
    }

    /**
     * Gửi tin nhắn mới & Phát Broadcast Realtime (FR-08.2, FR-08.3, FR-08.4, FR-08.5, FR-08.6)
     */
    public function sendMessage(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $conversation = Conversation::find($id);

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Cuộc trò chuyện không tồn tại',
            ], 404);
        }

        // FR-08.5: Kiểm tra quyền bảo mật - chỉ thành viên mới được gửi tin nhắn
        if ((int) $user->id !== (int) $conversation->candidate_id && (int) $user->id !== (int) $conversation->employer_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền truy cập vào cuộc trò chuyện này',
            ], 403);
        }

        $request->validate([
            'message' => ['nullable', 'string'],
            'image' => ['nullable', 'file', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
        ]);

        // FR-08.2: Hỗ trợ gửi tin nhắn văn bản (1 đến 1.000 ký tự) và gửi hình ảnh
        $imagePath = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
            if (! in_array($file->getMimeType(), $allowedMimes) || $file->getSize() > 5 * 1024 * 1024) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hình ảnh đính kèm phải có định dạng JPEG, PNG, GIF hoặc WEBP và dung lượng không quá 5MB',
                ], 400);
            }
            $imagePath = $file->store('chat_images', 'private');
        }

        $rawMessage = $request->input('message');
        $trimmed = $rawMessage !== null ? trim((string) $rawMessage) : '';

        // Không có ảnh và tin nhắn rỗng toàn khoảng trắng/enter (FR-08.2)
        if (! $imagePath && mb_strlen($trimmed) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Nội dung tin nhắn không được để trống hoặc chỉ chứa khoảng trắng',
            ], 400);
        }

        if (mb_strlen($trimmed) > 1000) {
            return response()->json([
                'success' => false,
                'message' => 'Nội dung tin nhắn không được vượt quá 1.000 ký tự',
            ], 400);
        }

        $messageContent = mb_strlen($trimmed) > 0 ? $trimmed : null;

        try {
            $message = DB::transaction(function () use ($conversation, $user, $messageContent, $imagePath) {
                $message = Message::create([
                    'conversation_id' => $conversation->id,
                    'sender_id' => $user->id,
                    'message' => $messageContent,
                    'image_path' => $imagePath,
                    'is_read' => 0,
                    'read_at' => null,
                ]);

                // Keep the message and conversation ordering timestamp consistent.
                $conversation->update(['last_message_at' => now()]);

                return $message;
            });
        } catch (\Throwable $exception) {
            if ($imagePath) {
                Storage::disk('private')->delete($imagePath);
            }
            throw $exception;
        }

        // Kích hoạt Broadcast WebSocket Reverb trong thời gian thực < 1s (FR-08.3)
        try {
            broadcast(new MessageSent($message))->toOthers();
        } catch (\Throwable $e) {
            // Không làm gián đoạn luồng API nếu Reverb daemon chưa bật
        }

        // FR-10: Gửi thông báo in-app cho người nhận
        $receiverId = (int) $user->id === (int) $conversation->candidate_id
            ? $conversation->employer_id
            : $conversation->candidate_id;

        $previewText = $messageContent ?: '[Hình ảnh đính kèm]';
        try {
            Notification::create([
                'user_id' => $receiverId,
                'title' => 'Tin nhắn mới từ '.$user->name,
                'content' => mb_substr($previewText, 0, 100),
                'type' => 'new_message',
                'data' => [
                    'conversation_id' => $conversation->id,
                    'message_id' => $message->id,
                ],
            ]);
        } catch (\Throwable $exception) {
            Log::error('Chat notification could not be created', [
                'message_id' => $message->id,
                'exception' => $exception->getMessage(),
            ]);
        }

        try {
            app(NotificationEmailService::class)->message($message);
        } catch (\Throwable) {
            Log::error('Chat email notification could not be queued', ['message_id' => $message->id]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Gửi tin nhắn thành công',
            'data' => [
                'id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'sender_id' => $message->sender_id,
                'sender_name' => $user->name,
                'message' => $message->message,
                'image_url' => $message->image_url,
                'is_read' => (bool) $message->is_read,
                'read_at' => $message->read_at?->toIso8601String(),
                'status_display' => $message->status_display,
                'time_display' => $message->time_display ?? $message->created_at?->format('H:i'),
                'created_at' => $message->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Đánh dấu tất cả tin nhắn trong phòng chat là "Đã xem" (FR-08.4)
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        $userId = $request->user()->id;
        $conversation = Conversation::find($id);

        if (! $conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Cuộc trò chuyện không tồn tại',
            ], 404);
        }

        // FR-08.5: Kiểm tra quyền bảo mật
        if ((int) $userId !== (int) $conversation->candidate_id && (int) $userId !== (int) $conversation->employer_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền truy cập vào cuộc trò chuyện này',
            ], 403);
        }

        $updated = Message::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $userId)
            ->where('is_read', 0)
            ->update([
                'is_read' => 1,
                'read_at' => now(),
            ]);

        if ($updated > 0) {
            try {
                broadcast(new MessagesRead($conversation->id, $userId))->toOthers();
            } catch (\Throwable $e) {
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu đã xem tất cả tin nhắn',
            'data' => [
                'conversation_id' => $conversation->id,
                'updated_count' => $updated,
            ],
        ], 200);
    }

    /** Stream a chat image only to members of its conversation. */
    public function downloadMessageImage(Request $request, $conversationId, $messageId)
    {
        $conversation = Conversation::find($conversationId);
        if (! $conversation) {
            return response()->json(['success' => false, 'message' => 'Cuộc trò chuyện không tồn tại'], 404);
        }

        $userId = (int) $request->user()->id;
        if ($userId !== (int) $conversation->candidate_id && $userId !== (int) $conversation->employer_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xem hình ảnh này'], 403);
        }

        $message = Message::where('conversation_id', $conversation->id)->find($messageId);
        if (! $message || ! $message->image_path) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy hình ảnh'], 404);
        }

        $disk = Storage::disk('private')->exists($message->image_path) ? 'private' : 'public';
        if (! Storage::disk($disk)->exists($message->image_path)) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy hình ảnh'], 404);
        }

        return response()->file(Storage::disk($disk)->path($message->image_path), [
            'Content-Type' => Storage::disk($disk)->mimeType($message->image_path) ?: 'application/octet-stream',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
