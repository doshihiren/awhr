<?php

namespace App\Listeners;

use App\Services\AuditLogService;
use Illuminate\Auth\Events\Login;

class LogSuccessfulLogin
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    public function handle(Login $event): void
    {
        $user = $event->user;
        if (method_exists($user, 'update')) {
            $user->forceFill(['last_login_at' => now()])->save();
        }

        $this->auditLogService->log('user_login', "User logged in: {$user->email}", $user);
    }
}
