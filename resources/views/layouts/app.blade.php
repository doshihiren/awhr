<!DOCTYPE html>
<html lang="en" data-bs-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Dashboard') — {{ config('app.name', 'AWHR') }}</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link href="https://cdn.datatables.net/1.13.8/css/dataTables.bootstrap5.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        :root {
            --awhr-primary: #1e5a96;
            --awhr-primary-dark: #0d3d6b;
            --awhr-primary-light: #e8f1fa;
            --awhr-accent: #2d7dd2;
            --awhr-sidebar-width: 260px;
            --awhr-bg: #f4f7fb;
        }
        [data-bs-theme="dark"] {
            --awhr-bg: #0f172a;
            --awhr-primary-light: #1e293b;
        }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: var(--awhr-bg);
            min-height: 100vh;
        }
        .awhr-sidebar {
            width: var(--awhr-sidebar-width);
            background: linear-gradient(180deg, var(--awhr-primary-dark) 0%, var(--awhr-primary) 100%);
            min-height: 100vh;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 1040;
            transition: transform .2s ease;
        }
        .awhr-sidebar .brand {
            padding: 1.25rem 1.5rem;
            color: #fff;
            font-weight: 700;
            font-size: 1.35rem;
            letter-spacing: .02em;
            border-bottom: 1px solid rgba(255,255,255,.12);
        }
        .awhr-sidebar .brand span { opacity: .75; font-weight: 500; font-size: .8rem; display: block; }
        .awhr-sidebar .nav-link {
            color: rgba(255,255,255,.82);
            padding: .65rem 1.5rem;
            border-radius: 0;
            font-size: .92rem;
            display: flex;
            align-items: center;
            gap: .75rem;
        }
        .awhr-sidebar .nav-link:hover,
        .awhr-sidebar .nav-link.active {
            background: rgba(255,255,255,.12);
            color: #fff;
        }
        .awhr-sidebar .nav-section {
            color: rgba(255,255,255,.45);
            font-size: .7rem;
            text-transform: uppercase;
            letter-spacing: .08em;
            padding: 1rem 1.5rem .35rem;
        }
        .awhr-main {
            margin-left: var(--awhr-sidebar-width);
            min-height: 100vh;
        }
        .awhr-topbar {
            background: #fff;
            border-bottom: 1px solid #e5eaf0;
            padding: .85rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        [data-bs-theme="dark"] .awhr-topbar { background: #1e293b; border-color: #334155; }
        .awhr-content { padding: 1.5rem; }
        .stat-card {
            background: #fff;
            border: none;
            border-radius: .75rem;
            box-shadow: 0 1px 3px rgba(15, 23, 42, .06);
            padding: 1.15rem 1.25rem;
            height: 100%;
            border-left: 4px solid var(--awhr-accent);
        }
        [data-bs-theme="dark"] .stat-card { background: #1e293b; }
        .stat-card .stat-label { color: #64748b; font-size: .8rem; font-weight: 500; }
        .stat-card .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--awhr-primary-dark); }
        [data-bs-theme="dark"] .stat-card .stat-value { color: #e2e8f0; }
        .stat-card .stat-icon {
            width: 42px; height: 42px; border-radius: .65rem;
            background: var(--awhr-primary-light);
            color: var(--awhr-primary);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.15rem;
        }
        .panel {
            background: #fff;
            border-radius: .75rem;
            box-shadow: 0 1px 3px rgba(15, 23, 42, .06);
            border: none;
        }
        [data-bs-theme="dark"] .panel { background: #1e293b; }
        .panel .panel-header {
            padding: 1rem 1.25rem;
            border-bottom: 1px solid #eef2f7;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        [data-bs-theme="dark"] .panel .panel-header { border-color: #334155; }
        .panel .panel-body { padding: 1.25rem; }
        .btn-awhr {
            background: var(--awhr-primary);
            border-color: var(--awhr-primary);
            color: #fff;
        }
        .btn-awhr:hover { background: var(--awhr-primary-dark); border-color: var(--awhr-primary-dark); color: #fff; }
        .page-title { font-weight: 700; color: var(--awhr-primary-dark); margin-bottom: .25rem; }
        [data-bs-theme="dark"] .page-title { color: #e2e8f0; }
        .badge-status-draft { background: #94a3b8; }
        .badge-status-calculated { background: #2d7dd2; }
        .badge-status-frozen { background: #f59e0b; }
        .badge-status-approved { background: #10b981; }
        .badge-status-locked { background: #64748b; }
        @media (max-width: 991.98px) {
            .awhr-sidebar { transform: translateX(-100%); }
            .awhr-sidebar.show { transform: translateX(0); }
            .awhr-main { margin-left: 0; }
        }
        .sidebar-backdrop {
            display: none;
            position: fixed; inset: 0;
            background: rgba(0,0,0,.4);
            z-index: 1035;
        }
        .sidebar-backdrop.show { display: block; }
    </style>
    @stack('styles')
</head>
<body>
    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>

    <aside class="awhr-sidebar" id="awhrSidebar">
        <div class="brand">
            AWHR
            <span>Payroll Management</span>
        </div>
        <nav class="nav flex-column py-2">
            <div class="nav-section">Main</div>
            <a class="nav-link {{ request()->routeIs('dashboard') ? 'active' : '' }}" href="{{ route('dashboard') }}">
                <i class="bi bi-grid-1x2"></i> Dashboard
            </a>

            <div class="nav-section">HR Master</div>
            <a class="nav-link {{ request()->routeIs('employees.*') ? 'active' : '' }}" href="{{ route('employees.index') }}">
                <i class="bi bi-people"></i> Employees
            </a>
            <a class="nav-link {{ request()->routeIs('attendance.*') ? 'active' : '' }}" href="{{ route('attendance.index') }}">
                <i class="bi bi-calendar-check"></i> Attendance
            </a>
            <a class="nav-link {{ request()->routeIs('leaves.*') ? 'active' : '' }}" href="{{ route('leaves.index') }}">
                <i class="bi bi-calendar2-heart"></i> Leave Management
            </a>

            <div class="nav-section">Payroll</div>
            <a class="nav-link {{ request()->routeIs('payroll.*') ? 'active' : '' }}" href="{{ route('payroll.index') }}">
                <i class="bi bi-cash-stack"></i> Payroll Processing
            </a>
            <a class="nav-link {{ request()->routeIs('bank-transfer.*') ? 'active' : '' }}" href="{{ route('bank-transfer.index') }}">
                <i class="bi bi-bank"></i> Bank Transfer
            </a>
            <a class="nav-link {{ request()->routeIs('form16.*') ? 'active' : '' }}" href="{{ route('form16.index') }}">
                <i class="bi bi-file-earmark-text"></i> Form 16
            </a>

            <div class="nav-section">Reports</div>
            <a class="nav-link {{ request()->routeIs('reports.*') ? 'active' : '' }}" href="{{ route('reports.index') }}">
                <i class="bi bi-bar-chart-line"></i> Reports
            </a>

            <div class="nav-section">System</div>
            <a class="nav-link {{ request()->routeIs('settings.*') ? 'active' : '' }}" href="{{ route('settings.index') }}">
                <i class="bi bi-gear"></i> Settings
            </a>
            <a class="nav-link {{ request()->routeIs('users.*') ? 'active' : '' }}" href="{{ route('users.index') }}">
                <i class="bi bi-person-gear"></i> Users
            </a>
            <a class="nav-link {{ request()->routeIs('audit-logs.*') ? 'active' : '' }}" href="{{ route('audit-logs.index') }}">
                <i class="bi bi-journal-text"></i> Audit Logs
            </a>
        </nav>
    </aside>

    <div class="awhr-main">
        <header class="awhr-topbar">
            <div class="d-flex align-items-center gap-3">
                <button class="btn btn-sm btn-outline-secondary d-lg-none" id="sidebarToggle" type="button">
                    <i class="bi bi-list"></i>
                </button>
                <div>
                    <div class="fw-semibold">@yield('page_title', 'Dashboard')</div>
                    <small class="text-muted">@yield('page_subtitle', '')</small>
                </div>
            </div>
            <div class="d-flex align-items-center gap-3">
                <button class="btn btn-sm btn-outline-secondary" id="themeToggle" type="button" title="Toggle dark mode">
                    <i class="bi bi-moon-stars"></i>
                </button>
                <div class="dropdown">
                    <button class="btn btn-sm btn-light dropdown-toggle" data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle me-1"></i> {{ Auth::user()->name }}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="{{ route('profile.edit') }}"><i class="bi bi-person me-2"></i>Profile</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <form method="POST" action="{{ route('logout') }}">
                                @csrf
                                <button class="dropdown-item text-danger" type="submit"><i class="bi bi-box-arrow-right me-2"></i>Logout</button>
                            </form>
                        </li>
                    </ul>
                </div>
            </div>
        </header>

        <main class="awhr-content">
            @if(session('success'))
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    {{ session('success') }}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            @endif
            @if(session('error'))
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    {{ session('error') }}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            @endif
            @if($errors->any())
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <ul class="mb-0">
                        @foreach($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            @endif

            @yield('content')
        </main>
    </div>

    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.8/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.8/js/dataTables.bootstrap5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <script>
        (function () {
            const root = document.documentElement;
            const saved = localStorage.getItem('awhr-theme');
            if (saved) root.setAttribute('data-bs-theme', saved);

            document.getElementById('themeToggle')?.addEventListener('click', function () {
                const next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
                root.setAttribute('data-bs-theme', next);
                localStorage.setItem('awhr-theme', next);
            });

            const sidebar = document.getElementById('awhrSidebar');
            const backdrop = document.getElementById('sidebarBackdrop');
            document.getElementById('sidebarToggle')?.addEventListener('click', function () {
                sidebar.classList.toggle('show');
                backdrop.classList.toggle('show');
            });
            backdrop?.addEventListener('click', function () {
                sidebar.classList.remove('show');
                backdrop.classList.remove('show');
            });

            $('.datatable').DataTable({ pageLength: 15, order: [] });
        })();
    </script>
    @stack('scripts')
</body>
</html>
