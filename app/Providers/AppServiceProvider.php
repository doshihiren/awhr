<?php

namespace App\Providers;

use App\Listeners\LogSuccessfulLogin;
use Illuminate\Auth\Events\Login;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Paginator::useBootstrapFive();

        Event::listen(Login::class, LogSuccessfulLogin::class);

        Gate::policy(\App\Models\Employee::class, \App\Policies\EmployeePolicy::class);
    }
}
