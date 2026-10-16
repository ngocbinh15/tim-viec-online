<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Danh sách thông báo in-app kèm số lượng chưa đọc (FR-10.3)
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $unreadCount = Notification::where('user_id', $userId)
            ->whereNull('read_at')
            ->count();

        $notifications = Notification::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        $formatted = $notifications->map(function ($notify) {
            return [
                'id' => $notify->id,
                'title' => $notify->title,
                'content' => $notify->content,
                'type' => $notify->type,
                'data' => $notify->data,
                'is_read' => $notify->isRead(),
                'read_at' => $notify->read_at?->toIso8601String(),
                'time_ago' => $notify->created_at?->diffForHumans(),
                'created_at' => $notify->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách thông báo thành công',
            'unread_count' => $unreadCount,
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

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu thông báo là đã đọc',
        ], 200);
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc (FR-10.3)
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu tất cả thông báo là đã đọc',
        ], 200);
    }
}
