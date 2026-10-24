<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Danh sách thông báo in-app kèm số lượng chưa đọc & phân loại màu sắc (FR-10.3)
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', 'in:read,unread'],
            'type' => ['nullable', 'string', 'max:50'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $userId = $request->user()->id;

        $unreadCount = Notification::where('user_id', $userId)
            ->whereNull('read_at')
            ->count();

        $query = Notification::where('user_id', $userId)
            ->orderBy('created_at', 'desc');

        // Lọc theo trạng thái đã đọc / chưa đọc (FR-10.3)
        if ($request->query('status') === 'unread') {
            $query->whereNull('read_at');
        } elseif ($request->query('status') === 'read') {
            $query->whereNotNull('read_at');
        }

        // Lọc theo loại thông báo nếu có
        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        $perPage = (int) $request->input('per_page', 15);
        $perPage = ($perPage > 0 && $perPage <= 50) ? $perPage : 15;

        $notifications = $query->paginate($perPage);

        $formatted = $notifications->map(function ($notify) {
            $isRead = $notify->isRead();

            return [
                'id' => $notify->id,
                'title' => $notify->title,
                'content' => $notify->content,
                'type' => $notify->type,
                'data' => $notify->data,
                'is_read' => $isRead,
                'read_at' => $notify->read_at?->toIso8601String(),
                'status_display' => $isRead ? 'Đã đọc' : 'Chưa đọc',
                'background_color' => $isRead ? 'white' : 'blue', // FR-10.3: Màu trắng nếu Đã đọc / Màu xanh nếu Chưa đọc
                'time_ago' => $notify->time_ago ?: $notify->created_at?->locale('vi')->diffForHumans(), // FR-10.3: ví dụ "5 phút trước"
                'redirect_url' => $notify->redirect_url, // FR-10.3: Chuyển hướng ngay tới màn hình chi tiết tương ứng
                'created_at' => $notify->created_at?->toIso8601String(),
                'created_at_display' => $notify->created_at?->format('H:i d/m/Y'),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách thông báo thành công',
            'unread_count' => $unreadCount, // FR-10.3: Hiển thị badge chuông trên thanh điều hướng
            'data' => $formatted,
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
        ], 200);
    }

    /**
     * Đánh dấu 1 thông báo là đã đọc (FR-10.3)
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        $notification = Notification::where('user_id', $request->user()->id)->find($id);

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông báo',
            ], 404);
        }

        $notification->markAsRead();

        $unreadCount = Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu thông báo là đã đọc',
            'unread_count' => $unreadCount,
            'data' => [
                'id' => $notification->id,
                'title' => $notification->title,
                'content' => $notification->content,
                'is_read' => true,
                'read_at' => $notification->read_at?->toIso8601String(),
                'redirect_url' => $notification->redirect_url,
            ],
        ], 200);
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc (FR-10.3)
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $updatedCount = Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu tất cả thông báo là đã đọc',
            'unread_count' => 0,
            'updated_count' => $updatedCount,
        ], 200);
    }

    /**
     * Xóa 1 thông báo
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $notification = Notification::where('user_id', $request->user()->id)->find($id);

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông báo',
            ], 404);
        }

        $notification->delete();

        $unreadCount = Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa thông báo thành công',
            'unread_count' => $unreadCount,
        ], 200);
    }
}
