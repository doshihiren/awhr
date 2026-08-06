@extends('layouts.app')

@section('title', 'Monthly Payroll Report')
@section('page_title', 'Monthly Payroll')
@section('page_subtitle', 'Calendar-year payroll overview')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Monthly Payroll Report</h1>
    <a href="{{ route('reports.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Reports</a>
</div>

<div class="panel mb-3">
    <div class="panel-body">
        <form method="GET" action="{{ route('reports.monthly-payroll') }}" class="row g-2 align-items-end">
            <div class="col-md-3">
                <label for="year" class="form-label">Calendar Year</label>
                <input id="year" type="number" name="year" value="{{ $year }}" min="2000" max="2100" class="form-control">
            </div>
            <div class="col-md-3"><button type="submit" class="btn btn-awhr"><i class="bi bi-funnel me-1"></i>View</button></div>
        </form>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-md-4"><div class="stat-card"><div class="stat-label">Total Gross</div><div class="stat-value">₹{{ number_format($payrolls->sum('total_gross'), 2) }}</div></div></div>
    <div class="col-md-4"><div class="stat-card" style="border-left-color:#ef4444"><div class="stat-label">Total Deductions</div><div class="stat-value">₹{{ number_format($payrolls->sum('total_deductions'), 2) }}</div></div></div>
    <div class="col-md-4"><div class="stat-card" style="border-left-color:#10b981"><div class="stat-label">Total Net Payroll</div><div class="stat-value">₹{{ number_format($payrolls->sum('total_net'), 2) }}</div></div></div>
</div>

<div class="panel">
    <div class="panel-header">Payroll Runs — {{ $year }}</div>
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light"><tr><th>Month</th><th class="text-center">Employees</th><th class="text-end">Gross</th><th class="text-end">Deductions</th><th class="text-end">Net</th><th>Status</th><th></th></tr></thead>
                <tbody>
                    @forelse($payrolls as $payroll)
                        <tr>
                            <td class="fw-semibold">{{ $payroll->period_label }}</td>
                            <td class="text-center">{{ $payroll->total_employees }}</td>
                            <td class="text-end">₹{{ number_format($payroll->total_gross, 2) }}</td>
                            <td class="text-end">₹{{ number_format($payroll->total_deductions, 2) }}</td>
                            <td class="text-end fw-semibold">₹{{ number_format($payroll->total_net, 2) }}</td>
                            <td><span class="badge badge-status-{{ $payroll->status }}">{{ ucfirst($payroll->status) }}</span></td>
                            <td class="text-end"><a href="{{ route('payroll.show', $payroll) }}" class="btn btn-sm btn-outline-primary">View</a></td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="text-center text-muted py-5">No payroll runs found for {{ $year }}.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
