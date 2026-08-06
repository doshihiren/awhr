@extends('layouts.app')

@section('title', 'Dashboard')
@section('page_title', 'Dashboard')
@section('page_subtitle', 'Salary & payroll overview')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <h1 class="page-title h3 mb-0">Welcome, {{ Auth::user()->name }}</h1>
    <div class="d-flex gap-2">
        <a href="{{ route('payroll.create') }}" class="btn btn-awhr btn-sm"><i class="bi bi-plus-lg me-1"></i>Generate Payroll</a>
        <a href="{{ route('employees.create') }}" class="btn btn-outline-primary btn-sm"><i class="bi bi-person-plus me-1"></i>Add Employee</a>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-6 col-xl-3">
        <div class="stat-card">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="stat-label">Total Employees</div>
                    <div class="stat-value">{{ $stats['total_employees'] }}</div>
                </div>
                <div class="stat-icon"><i class="bi bi-people"></i></div>
            </div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card" style="border-left-color:#10b981">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="stat-label">Salary Paid</div>
                    <div class="stat-value">₹{{ number_format($stats['salary_paid'], 0) }}</div>
                </div>
                <div class="stat-icon" style="color:#10b981"><i class="bi bi-check2-circle"></i></div>
            </div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card" style="border-left-color:#f59e0b">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="stat-label">Pending Salary</div>
                    <div class="stat-value">₹{{ number_format($stats['pending_salary'], 0) }}</div>
                </div>
                <div class="stat-icon" style="color:#f59e0b"><i class="bi bi-hourglass-split"></i></div>
            </div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card" style="border-left-color:#8b5cf6">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="stat-label">On Leave</div>
                    <div class="stat-value">{{ $stats['employees_on_leave'] }}</div>
                </div>
                <div class="stat-icon" style="color:#8b5cf6"><i class="bi bi-calendar2-x"></i></div>
            </div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card">
            <div class="stat-label">Current Month Payroll</div>
            <div class="stat-value fs-5">
                @if($stats['current_month_payroll'])
                    <span class="badge badge-status-{{ $stats['current_month_payroll']->status }}">{{ ucfirst($stats['current_month_payroll']->status) }}</span>
                    <div class="mt-1">₹{{ number_format($stats['current_month_payroll']->total_net, 0) }}</div>
                @else
                    <span class="text-muted fs-6">Not generated</span>
                @endif
            </div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card">
            <div class="stat-label">Monthly Salary Cost</div>
            <div class="stat-value">₹{{ number_format($stats['monthly_salary_cost'], 0) }}</div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card">
            <div class="stat-label">Leave Liability</div>
            <div class="stat-value">₹{{ number_format($stats['current_leave_liability'], 0) }}</div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card">
            <div class="stat-label">Upcoming Birthdays</div>
            <div class="stat-value">{{ $stats['upcoming_birthdays']->count() }}</div>
        </div>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-lg-8">
        <div class="panel h-100">
            <div class="panel-header">Monthly Salary Cost Trend</div>
            <div class="panel-body">
                <canvas id="salaryChart" height="120"></canvas>
            </div>
        </div>
    </div>
    <div class="col-lg-4">
        <div class="panel h-100">
            <div class="panel-header">Quick Actions</div>
            <div class="panel-body d-grid gap-2">
                <a href="{{ route('employees.create') }}" class="btn btn-outline-primary text-start"><i class="bi bi-person-plus me-2"></i>Add Employee</a>
                <a href="{{ route('attendance.index') }}" class="btn btn-outline-primary text-start"><i class="bi bi-calendar-check me-2"></i>Enter Attendance</a>
                <a href="{{ route('payroll.create') }}" class="btn btn-outline-primary text-start"><i class="bi bi-cash-stack me-2"></i>Process Payroll</a>
                <a href="{{ route('leaves.index') }}" class="btn btn-outline-primary text-start"><i class="bi bi-calendar2-heart me-2"></i>Manage Leaves</a>
                <a href="{{ route('bank-transfer.index') }}" class="btn btn-outline-primary text-start"><i class="bi bi-bank me-2"></i>Bank Transfer Sheet</a>
                <a href="{{ route('reports.index') }}" class="btn btn-outline-primary text-start"><i class="bi bi-bar-chart me-2"></i>View Reports</a>
            </div>
        </div>
    </div>
</div>

<div class="row g-3">
    <div class="col-lg-6">
        <div class="panel">
            <div class="panel-header">Upcoming Birthdays (30 days)</div>
            <div class="panel-body p-0">
                <div class="list-group list-group-flush">
                    @forelse($stats['upcoming_birthdays'] as $emp)
                        <a href="{{ route('employees.show', $emp) }}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                            <span><img src="{{ $emp->photo_url }}" class="rounded-circle me-2" width="32" height="32" alt="">{{ $emp->name }}</span>
                            <span class="badge text-bg-light">{{ $emp->dob->format('d M') }}</span>
                        </a>
                    @empty
                        <div class="p-3 text-muted">No upcoming birthdays.</div>
                    @endforelse
                </div>
            </div>
        </div>
    </div>
    <div class="col-lg-6">
        <div class="panel">
            <div class="panel-header">Notifications</div>
            <div class="panel-body p-0">
                <div class="list-group list-group-flush">
                    @forelse($notifications as $n)
                        <form method="POST" action="{{ route('notifications.read', $n) }}">
                            @csrf
                            <button type="submit" class="list-group-item list-group-item-action text-start {{ $n->is_read ? '' : 'fw-semibold' }}">
                                <div class="d-flex justify-content-between">
                                    <span>{{ $n->title }}</span>
                                    <small class="text-muted">{{ $n->created_at->diffForHumans() }}</small>
                                </div>
                                <small class="text-muted">{{ $n->message }}</small>
                            </button>
                        </form>
                    @empty
                        <div class="p-3 text-muted">No notifications.</div>
                    @endforelse
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
new Chart(document.getElementById('salaryChart'), {
    type: 'line',
    data: {
        labels: @json($stats['chart_labels']),
        datasets: [{
            label: 'Net Payroll (₹)',
            data: @json($stats['chart_data']),
            borderColor: '#1e5a96',
            backgroundColor: 'rgba(30,90,150,.12)',
            fill: true,
            tension: .35
        }]
    },
    options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
    }
});
</script>
@endpush
