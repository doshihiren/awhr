<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Sign In — {{ config('app.name', 'AWHR') }}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root { --awhr-primary: #1e5a96; --awhr-primary-dark: #0d3d6b; --awhr-light: #e8f1fa; }
        body {
            min-height: 100vh;
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: linear-gradient(135deg, #eef5fc 0%, #f8fafc 48%, #dcebf8 100%);
        }
        .login-shell { min-height: 100vh; }
        .brand-panel {
            min-height: 620px;
            padding: 4rem;
            color: #fff;
            background: linear-gradient(145deg, var(--awhr-primary-dark), var(--awhr-primary));
            border-radius: 1.25rem 0 0 1.25rem;
            position: relative;
            overflow: hidden;
        }
        .brand-panel::before, .brand-panel::after {
            content: '';
            position: absolute;
            border-radius: 50%;
            background: rgba(255,255,255,.08);
        }
        .brand-panel::before { width: 300px; height: 300px; right: -100px; top: -80px; }
        .brand-panel::after { width: 220px; height: 220px; left: -80px; bottom: -90px; }
        .brand-mark {
            width: 54px; height: 54px; display: inline-flex; align-items: center; justify-content: center;
            border: 1px solid rgba(255,255,255,.28); border-radius: .9rem; background: rgba(255,255,255,.12);
            font-size: 1.2rem; font-weight: 700;
        }
        .login-card { width: 100%; max-width: 980px; border: 0; border-radius: 1.25rem; box-shadow: 0 24px 70px rgba(13,61,107,.16); overflow: hidden; }
        .form-panel { min-height: 620px; padding: 4rem; background: #fff; }
        .form-control { min-height: 48px; border-color: #dbe3ec; }
        .form-control:focus { border-color: var(--awhr-primary); box-shadow: 0 0 0 .2rem rgba(30,90,150,.12); }
        .btn-awhr { min-height: 48px; color: #fff; background: var(--awhr-primary); border-color: var(--awhr-primary); font-weight: 600; }
        .btn-awhr:hover { color: #fff; background: var(--awhr-primary-dark); border-color: var(--awhr-primary-dark); }
        .form-check-input:checked { background-color: var(--awhr-primary); border-color: var(--awhr-primary); }
        .awhr-link { color: var(--awhr-primary); text-decoration: none; }
        .awhr-link:hover { color: var(--awhr-primary-dark); text-decoration: underline; }
        @media (max-width: 767.98px) {
            .form-panel { min-height: auto; padding: 2rem 1.5rem; }
            .login-card { margin: 1rem; }
        }
    </style>
</head>
<body>
<main class="login-shell d-flex align-items-center justify-content-center">
    <div class="card login-card">
        <div class="row g-0">
            <div class="col-md-5 d-none d-md-block">
                <section class="brand-panel d-flex flex-column justify-content-between">
                    <div class="position-relative">
                        <div class="brand-mark mb-4">AW</div>
                        <h1 class="display-6 fw-bold mb-3">AWHR</h1>
                        <p class="fs-5 opacity-75">Payroll Management</p>
                    </div>
                    <div class="position-relative">
                        <h2 class="h5 fw-semibold">Simple, accurate payroll.</h2>
                        <p class="opacity-75 mb-0">Manage employees, attendance, leave, payroll, payslips, and reporting from one secure workspace.</p>
                    </div>
                </section>
            </div>
            <div class="col-md-7">
                <section class="form-panel d-flex flex-column justify-content-center">
                    <div class="d-md-none text-primary fw-bold fs-4 mb-4">AWHR <span class="text-muted fw-normal fs-6">Payroll Management</span></div>
                    <div class="mb-4">
                        <h2 class="h3 fw-bold mb-2" style="color:var(--awhr-primary-dark)">Welcome back</h2>
                        <p class="text-muted mb-0">Sign in to continue to your payroll workspace.</p>
                    </div>

                    @if(session('status'))
                        <div class="alert alert-success" role="alert">{{ session('status') }}</div>
                    @endif
                    @if($errors->any())
                        <div class="alert alert-danger" role="alert">
                            <ul class="mb-0 ps-3">@foreach($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>
                        </div>
                    @endif

                    <form method="POST" action="{{ route('login') }}">
                        @csrf
                        <div class="mb-3">
                            <label for="email" class="form-label fw-semibold">Email address</label>
                            <div class="input-group">
                                <span class="input-group-text bg-white border-end-0"><i class="bi bi-envelope text-muted"></i></span>
                                <input id="email" type="email" name="email" value="{{ old('email') }}" class="form-control border-start-0 @error('email') is-invalid @enderror" placeholder="you@company.com" autocomplete="username" required autofocus>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <label for="password" class="form-label fw-semibold">Password</label>
                                @if(Route::has('password.request'))
                                    <a href="{{ route('password.request') }}" class="awhr-link small">Forgot password?</a>
                                @endif
                            </div>
                            <div class="input-group">
                                <span class="input-group-text bg-white border-end-0"><i class="bi bi-lock text-muted"></i></span>
                                <input id="password" type="password" name="password" class="form-control border-start-0 @error('password') is-invalid @enderror" placeholder="Enter your password" autocomplete="current-password" required>
                            </div>
                        </div>
                        <div class="form-check mb-4">
                            <input id="remember" type="checkbox" name="remember" class="form-check-input">
                            <label for="remember" class="form-check-label text-muted">Remember me on this device</label>
                        </div>
                        <button type="submit" class="btn btn-awhr w-100">Sign In <i class="bi bi-arrow-right ms-1"></i></button>
                    </form>
                    <div class="alert alert-light border mt-4 mb-0 small">
                        <div class="fw-semibold mb-1">Demo logins</div>
                        <div>Admin: <code>admin@awhr.local</code> / <code>password</code></div>
                        <div>Employee: <code>rahul@awhr.local</code> / <code>Emp@EMP001</code></div>
                    </div>
                    <p class="text-center text-muted small mt-3 mb-0">Authorized access only · AWHR Payroll</p>
                </section>
            </div>
        </div>
    </div>
</main>
</body>
</html>
