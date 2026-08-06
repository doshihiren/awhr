@extends('layouts.app')

@section('title', 'My Dashboard')
@section('page_title', 'My Dashboard')
@section('page_subtitle', $employee->employee_code . ' · ' . ($employee->designation ?: 'Employee'))

@section('content')
<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
    <div>
        <h1 class="page-title h4 mb-1">Hello, {{ $employee->name }}</h1>
        <div class="text-muted">{{ now()->format('l, d M Y') }}</div>
    </div>
    <div class="d-flex gap-2">
        @if(!$today || !$today->check_in)
            <form method="POST" action="{{ route('portal.check-in') }}">@csrf
                <button class="btn btn-awhr"><i class="bi bi-box-arrow-in-right me-1"></i>Check In</button>
            </form>
        @elseif(!$today->check_out)
            <form method="POST" action="{{ route('portal.check-out') }}">@csrf
                <button class="btn btn-success"><i class="bi bi-box-arrow-right me-1"></i>Check Out</button>
            </form>
        @else
            <span class="badge text-bg-secondary align-self-center">Checked out at {{ substr($today->check_out, 0, 5) }}</span>
        @endif
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-6 col-lg-3">
        <div class="stat-card">
            <div class="stat-label">Today</div>
            <div class="stat-value fs-5">
                @if($today?->check_in)
                    {{ substr($today->check_in, 0, 5) }}
                    @if($today->is_late)<span class="badge text-bg-warning ms-1">Late</span>@endif
                @else
                    <span class="text-muted fs-6">Not checked in</span>
                @endif
            </div>
        </div>
    </div>
    <div class="col-6 col-lg-3">
        <div class="stat-card" style="border-left-color:#10b981">
            <div class="stat-label">Present (This Month)</div>
            <div class="stat-value">{{ $presentThisMonth }}</div>
        </div>
    </div>
    <div class="col-6 col-lg-3">
        <div class="stat-card" style="border-left-color:#f59e0b">
            <div class="stat-label">Late Marks</div>
            <div class="stat-value">{{ $lateThisMonth }}</div>
        </div>
    </div>
    <div class="col-6 col-lg-3">
        <div class="stat-card" style="border-left-color:#8b5cf6">
            <div class="stat-label">Leave Balance ({{ $fy }})</div>
            <div class="stat-value">{{ $leave->current_balance }}</div>
        </div>
    </div>
</div>

<div class="row g-3">
    <div class="col-lg-7">
        <div class="panel mb-3">
            <div class="panel-header">
                <span>This Month Attendance</span>
                <a href="{{ route('portal.attendance') }}" class="btn btn-sm btn-outline-primary">View all</a>
            </div>
            <div class="panel-body p-0">
                <div class="table-responsive">
                    <table class="table mb-0 align-middle">
                        <thead class="table-light"><tr><th>Date</th><th>In</th><th>Out</th><th>Status</th><th>Late</th></tr></thead>
                        <tbody>
                            @forelse($monthDays->take(10) as $day)
                                <tr>
                                    <td>{{ $day->date->format('d M') }}</td>
                                    <td>{{ $day->check_in ? substr($day->check_in, 0, 5) : '—' }}</td>
                                    <td>{{ $day->check_out ? substr($day->check_out, 0, 5) : '—' }}</td>
                                    <td><span class="badge text-bg-light text-capitalize">{{ str_replace('_', ' ', $day->status) }}</span></td>
                                    <td>
                                        @if($day->is_late)
                                            <span class="badge text-bg-warning">{{ $day->late_minutes }} min</span>
                                        @else — @endif
                                    </td>
                                </tr>
                            @empty
                                <tr><td colspan="5" class="text-center text-muted py-4">No attendance yet this month.</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <div class="col-lg-5">
        <div class="panel mb-3">
            <div class="panel-header">
                <span>Payslips</span>
                <a href="{{ route('portal.payslips') }}" class="btn btn-sm btn-outline-primary">All</a>
            </div>
            <div class="panel-body p-0">
                <div class="list-group list-group-flush">
                    @forelse($recentPayslips as $slip)
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-semibold">{{ $slip->payroll->period_label }}</div>
                                <small class="text-muted">Net ₹{{ number_format($slip->net_salary, 2) }}</small>
                            </div>
                            <a href="{{ route('portal.payslips.download', $slip) }}" class="btn btn-sm btn-outline-danger"><i class="bi bi-download"></i></a>
                        </div>
                    @empty
                        <div class="p-3 text-muted">No payslips available yet.</div>
                    @endforelse
                </div>
            </div>
        </div>
        <div class="panel">
            <div class="panel-header">Quick Links</div>
            <div class="panel-body d-grid gap-2">
                <a href="{{ route('portal.leaves') }}" class="btn btn-outline-primary text-start"><i class="bi bi-calendar2-heart me-2"></i>My Leaves</a>
                <a href="{{ route('portal.attendance') }}" class="btn btn-outline-primary text-start"><i class="bi bi-calendar-check me-2"></i>Attendance History</a>
                <a href="{{ route('portal.payslips') }}" class="btn btn-outline-primary text-start"><i class="bi bi-file-earmark-pdf me-2"></i>Download Salary Slips</a>
            </div>
        </div>
    </div>
</div>
@endsection
