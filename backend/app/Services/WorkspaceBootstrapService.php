<?php

namespace App\Services;

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\CandidateProfileController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Resources\AdminWorkspaceJobResource;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\JobResource;
use App\Models\Application;
use App\Models\Category;
use App\Models\Job;
use App\Models\Notification;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** One authenticated read instead of repeating PHP bootstrap for every list page. */
class WorkspaceBootstrapService
{
    public function load(Request $request): array
    {
        // Client query parameters cannot change the role, owner, or collection scope.
        $request = $request->duplicate([]);
        $user = $request->user();

        return match ($user->role) {
            'candidate' => $this->candidate($request),
            'employer' => $this->employer($request),
            'admin' => $this->admin($request),
            default => abort(403),
        };
    }

    private function employer(Request $request): array
    {
        $user = $request->user();
        $company = app(CompanyController::class)->myCompany($request)->getData(true)['data'];
        // myCompany may initialize a new employer's empty company profile.
        $user->unsetRelation('company');
        $companyId = $company['id'];
        $jobs = Job::where('company_id', $companyId)->withCount('applications')
            ->with(['category', 'skills'])->orderByDesc('updated_at')->orderByDesc('id')->get();
        $applications = Application::whereHas('job', fn ($query) => $query->where('company_id', $companyId))
            ->with(['job.company', 'candidateProfile.user', 'candidateProfile.skills', 'aiAnalysis'])
            ->orderByDesc('id')->get();

        return [
            'role' => 'employer',
            'company' => $company,
            'jobs' => JobResource::collection($jobs)->resolve($request),
            'applications' => ApplicationResource::collection($applications)->resolve($request),
            'conversations' => app(ChatController::class)->index($request)->getData(true)['data'],
            ...$this->notifications($request),
            'categories' => JsonResource::collection(Category::withCount(['jobs' => fn ($query) => $query->active()])->get())->resolve($request),
            'skills' => JsonResource::collection(Skill::orderBy('name')->get())->resolve($request),
        ];
    }

    private function candidate(Request $request): array
    {
        $profile = app(CandidateProfileController::class)->show($request)->getData(true)['data'];
        $user = $request->user();
        $user->unsetRelation('candidateProfile');
        $candidate = $user->candidateProfile;
        $relations = [
            'company.user', 'category', 'skills',
            'savedByCandidates' => fn ($query) => $query->where('candidate_profiles.id', $candidate->id),
            'applications' => fn ($query) => $query->where('candidate_id', $candidate->id),
        ];
        $saved = $candidate->savedJobs()->with($relations)->orderByDesc('saved_jobs.created_at')->orderByDesc('jobs.id')->get();
        $applications = Application::where('candidate_id', $candidate->id)
            ->with(['job.company.user', 'job.category', 'job.skills'])
            ->orderByDesc('created_at')->orderByDesc('id')->get();
        $conversations = app(ChatController::class)->index($request)->getData(true)['data'];
        // Membership, rather than the public active-job scope, preserves closed-job chats.
        $conversationJobs = Job::whereIn('id', array_unique(array_column($conversations, 'job_id')))
            ->with($relations)->orderBy('id')->get();

        return [
            'role' => 'candidate',
            'profile' => $profile,
            'skills' => JsonResource::collection(Skill::orderBy('name')->get())->resolve($request),
            'saved_jobs' => JobResource::collection($saved)->resolve($request),
            'applications' => ApplicationResource::collection($applications)->resolve($request),
            'conversations' => $conversations,
            'conversation_jobs' => JobResource::collection($conversationJobs)->resolve($request),
            ...$this->notifications($request),
        ];
    }

    private function admin(Request $request): array
    {
        $stats = app(AdminController::class)->stats($request->duplicate(['days' => 14]))->getData(true)['data'];
        // Recent rows already exist in the workspace collections; do not repeat
        // full applications/jobs (including CV paths and narratives) in stats.
        unset($stats['recent_applications'], $stats['recent_users']);
        return [
            'role' => 'admin',
            'users' => JsonResource::collection(User::select(['id', 'name', 'email', 'phone', 'role', 'status', 'created_at'])->with('company')->orderByDesc('id')->get())->resolve($request),
            'jobs' => AdminWorkspaceJobResource::collection(Job::select(AdminWorkspaceJobResource::COLUMNS)->with('skills:id,name')->withCount('applications')->orderByDesc('id')->get())->resolve($request),
            'categories' => JsonResource::collection(Category::withCount('jobs')->orderByDesc('id')->get())->resolve($request),
            'skills' => JsonResource::collection(Skill::withCount(['jobs', 'candidateProfiles'])->orderByDesc('id')->get())->resolve($request),
            'stats' => $stats,
        ];
    }

    /** Same notification DTO as the paginated endpoint, without truncating history. */
    private function notifications(Request $request): array
    {
        $user = $request->user();
        $notifications = Notification::where('user_id', $user->id)->orderByDesc('created_at')->orderByDesc('id')->get();
        $unread = $notifications->whereNull('read_at')->count();

        return [
            'notifications' => $notifications->map(function ($notification) use ($user) {
                $notification->setRelation('user', $user);
                $read = $notification->isRead();

                return [
                    'id' => $notification->id,
                    'title' => $notification->title,
                    'content' => $notification->content,
                    'type' => $notification->type,
                    'data' => $notification->data,
                    'is_read' => $read,
                    'read_at' => $notification->read_at?->toIso8601String(),
                    'status_display' => $notification->status_display,
                    'background_color' => $read ? 'white' : 'blue',
                    'time_ago' => $notification->time_ago,
                    'redirect_url' => $notification->redirect_url,
                    'created_at' => $notification->created_at?->toIso8601String(),
                    'created_at_display' => $notification->created_at?->format('H:i d/m/Y'),
                ];
            })->all(),
            'notification_counts' => ['unread' => $unread, 'total' => $notifications->count(), 'read' => $notifications->count() - $unread],
        ];
    }
}
