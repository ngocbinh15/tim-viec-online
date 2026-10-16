<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Conversation;
use App\Models\Job;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    /**
     * Danh sách phòng trò chuyện của người dùng hiện tại (FR-08.1)
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $conversations = Conversation::where('candidate_id', $userId)
            ->orWhere('employer_id', $userId)
            ->with([
                'candidate.candidateProfile',
                'employer.company',
                'job',
                'messages' => function ($q) {
                    $q->latest()->limit(1);
                },
            ])
            ->orderBy('last_message_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        $data = $conversations->map(function ($conv) use ($userId) {
            $isCandidate = (int) $userId === (int) $conv->candidate_id;
            $partner = $isCandidate ? $conv->employer : $conv->candidate;
            $partnerName = $isCandidate
                ? ($conv->employer?->company?->name ?? $conv->employer?->name)
                : $conv->candidate?->name;

            $partnerAvatar = $isCandidate
                ? ($conv->employer?->company?->logo ? asset('storage/' . $conv->employer->company->logo) : null)
                : ($conv->candidate?->candidateProfile?->avatar ? asset('storage/' . $conv->candidate->candidateProfile->avatar) : null);

            $lastMsg = $conv->messages->first();

            return [
                'id' => $conv->id,
                'job_id' => $conv->job_id,
                'job_title' => $conv->job?->title,
                'job_status' => $conv->job?->status, // Để hiển thị nhãn phụ "Tin tuyển dụng đã đóng" theo FR-04.6 & FR-08.6
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
                    'is_read' => (bool) $lastMsg->is_read,
                    'time_display' => $lastMsg->created_at?->format('H:i'),
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
    public function startConversation(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'job_id' => ['required', 'integer', 'exists:jobs,id'],
            'partner_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $job = Job::with('company')->find($request->job_id);

        if ($user->isCandidate()) {
            $candidateId = $user->id;
            $employerId = $request->partner_id;
        } else {
            $employerId = $user->id;
            $candidateId = $request->partner_id;
        }

        // FR-08.1: Kiểm tra ứng viên đã nộp đơn vào công việc này chưa
        $candidateUser = User::find($candidateId);
        $candidateProfile = $candidateUser?->candidateProfile;

        if (!$candidateProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ của ứng viên',
            ], 404);
        }

        $hasApplication = Application::where('job_id', $job->id)
            ->where('candidate_id', $candidateProfile->id)
            ->exists();

        if (!$hasApplication) {
            return response()->json([
                'success' => false,
                'message' => 'Phòng trò chuyện chỉ được tạo khi ứng viên đã nộp hồ sơ vào tin tuyển dụng này',
            ], 400);
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
     * Xem lịch sử tin nhắn trong phòng chat (FR-08.4)
     */
    public function messages(Request $request, $id): JsonResponse
    {
        $userId = $request->user()->id;
        $conversation = Conversation::find($id);

        if (!$conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Cuộc trò chuyện không tồn tại',
            ], 404);
        }

        // FR-08.5: Kiểm tra quyền bảo mật
        if ((int) $userId !== (int) $conversation->candidate_id && (int) $userId !== (int) $conversation->employer_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền truy cập vào chức năng này',
            ], 403);
        }

        // Đánh dấu tất cả tin nhắn gửi cho mình là "Đã xem" (is_read = 1) theo FR-08.4
        Message::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $userId)
            ->where('is_read', 0)
            ->update(['is_read' => 1]);

        $messages = Message::where('conversation_id', $conversation->id)
            ->with('sender')
            ->orderBy('created_at', 'asc')
            ->paginate(50);

        $formatted = $messages->map(function ($msg) {
            return [
                'id' => $msg->id,
                'conversation_id' => $msg->conversation_id,
                'sender_id' => $msg->sender_id,
                'sender_name' => $msg->sender?->name,
                'message' => $msg->message,
                'is_read' => (bool) $msg->is_read,
                'time_display' => $msg->created_at?->format('H:i'),
                'created_at' => $msg->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Lấy lịch sử tin nhắn thành công',
            'data' => $formatted,
            'meta' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
            ],
        ], 200);
    }

    /**
     * Gửi tin nhắn mới & Phát Broadcast Realtime (FR-08.2 - FR-08.4)
     */
    public function sendMessage(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $conversation = Conversation::find($id);

        if (!$conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Cuộc trò chuyện không tồn tại',
            ], 404);
        }

        // FR-08.5: Kiểm tra quyền
        if ((int) $user->id !== (int) $conversation->candidate_id && (int) $user->id !== (int) $conversation->employer_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền truy cập vào chức năng này',
            ], 403);
        }

        // FR-08.2: Ràng buộc tin nhắn 1 đến 1.000 ký tự, không rỗng dấu cách
        $rawMessage = (string) $request->input('message');
        $trimmed = trim($rawMessage);

        if (mb_strlen($trimmed) < 1 || mb_strlen($trimmed) > 1000) {
            return response()->json([
                'success' => false,
                'message' => 'Nội dung tin nhắn phải từ 1 đến 1.000 ký tự và không được để trống',
            ], 400);
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'message' => $trimmed,
            'is_read' => 0,
        ]);

        // Cập nhật last_message_at cho phòng chat
        $conversation->update([
            'last_message_at' => now(),
        ]);

        // Kích hoạt Broadcast WebSocket Reverb
        try {
            broadcast(new MessageSent($message))->toOthers();
        } catch (\Throwable $e) {
            // Không làm ngắt luồng API nếu Reverb daemon chưa chạy
        }

        // FR-10: Gửi thông báo in-app cho người nhận
        $receiverId = (int) $user->id === (int) $conversation->candidate_id
            ? $conversation->employer_id
            : $conversation->candidate_id;

        Notification::create([
            'user_id' => $receiverId,
            'title' => 'Tin nhắn mới từ ' . $user->name,
            'content' => mb_substr($trimmed, 0, 100),
            'type' => 'new_message',
            'data' => [
                'conversation_id' => $conversation->id,
                'message_id' => $message->id,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Gửi tin nhắn thành công',
            'data' => [
                'id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'sender_id' => $message->sender_id,
                'sender_name' => $user->name,
                'message' => $message->message,
                'is_read' => (bool) $message->is_read,
                'time_display' => $message->created_at?->format('H:i'),
                'created_at' => $message->created_at?->toIso8601String(),
            ],
        ], 201);
    }
}
