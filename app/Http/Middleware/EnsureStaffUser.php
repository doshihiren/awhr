<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaffUser
{
    /**
     * Allow only admin/hr/manager into admin modules.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || $user->role === 'employee') {
            return redirect()->route('portal.dashboard')
                ->with('error', 'You do not have access to the admin panel.');
        }

        return $next($request);
    }
}
