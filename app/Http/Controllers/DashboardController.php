<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Services\DashboardService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboardService
    ) {}

    public function index(): View
    {
        $user = Auth::user();
        $companyId = $user->company_id;

        $this->dashboardService->syncNotifications($companyId, $user->id);
        $stats = $this->dashboardService->getStats($companyId);

        $notifications = AppNotification::where('company_id', $companyId)
            ->where(function ($q) use ($user) {
                $q->whereNull('user_id')->orWhere('user_id', $user->id);
            })
            ->latest()
            ->limit(8)
            ->get();

        return view('dashboard.index', compact('stats', 'notifications'));
    }

    public function markNotificationRead(AppNotification $notification): RedirectResponse
    {
        abort_unless($notification->company_id === Auth::user()->company_id, 403);
        $notification->markAsRead();

        return $notification->link
            ? redirect($notification->link)
            : back();
    }
}
