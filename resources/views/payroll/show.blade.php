@extends('layouts.app')

@section('title', 'Payroll ' . $payroll->period_label)
@section('page_title', 'Payroll Details')
@section('page_subtitle', $payroll->period_label . ' · ' . $payroll->financial_year)

@section('content')
<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <div>
        <h1 class="page-title h4 mb-1">{{ $payroll->period_label }}</h1>
        <span class="badge badge-status-{{ $payroll->status }}">{{ ucfirst($payroll->status) }}</span>
    </div>
    <div class="d-flex flex-wrap gap-2">
        @if($payroll->isEditable())
            <form method="POST" action="{{ route('payroll.calculate', $payroll) }}" onsubmit="return confirm('Calculate payroll from current attendance? Existing calculated details will be replaced.')">
                @csrf
                <button type="submit" class="btn btn-awhr"><i class="bi bi-calculator me-1"></i>{{ $payroll->status === 'calculated' ? 'Recalculate' : 'Calculate' }}</button>
            </form>
        @endif
        @if($payroll->canFreeze())
            <form method="POST" action="{{ route('payroll.freeze', $payroll) }}" onsubmit="return confirm('Freeze this payroll? Salary details will no longer be editable.')">
                @csrf
                <button type="submit" class="btn btn-warning"><i class="bi bi-snow me-1"></i>Freeze</button>
            </form>
        @endif
        @if($payroll->canApprove())
            <form method="POST" action="{{ route('payroll.approve', $payroll) }}" onsubmit="return confirm('Approve this payroll and mark salaries as paid?')">
                @csrf
                <button type="submit" class="btn btn-success"><i class="bi bi-check-circle me-1"></i>Approve</button>
            </form>
        @endif
        @if($payroll->canLock())
            <form method="POST" action="{{ route('payroll.lock', $payroll) }}" onsubmit="return confirm('Lock this payroll permanently?')">
                @csrf
                <button type="submit" class="btn btn-secondary"><i class="bi bi-lock me-1"></i>Lock</button>
            </form>
        @endif
        @if($payroll->details->isNotEmpty())
            <a href="{{ route('payslips.index', $payroll) }}" class="btn btn-outline-primary"><i class="bi bi-receipt me-1"></i>Payslips</a>
            <a href="{{ route('payslips.download-all', $payroll) }}" class="btn btn-outline-primary"><i class="bi bi-download me-1"></i>Download All</a>
        @endif
        <a href="{{ route('payroll.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Back</a>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-6 col-xl-3">
        <div class="stat-card">
            <div class="stat-label">Employees</div>
            <div class="stat-value">{{ $payroll->total_employees }}</div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card">
            <div class="stat-label">Gross Salary</div>
            <div class="stat-value">₹{{ number_format($payroll->total_gross, 2) }}</div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card" style="border-left-color:#ef4444">
            <div class="stat-label">Total Deductions</div>
            <div class="stat-value">₹{{ number_format($payroll->total_deductions, 2) }}</div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card" style="border-left-color:#10b981">
            <div class="stat-label">Net Payroll</div>
            <div class="stat-value">₹{{ number_format($payroll->total_net, 2) }}</div>
        </div>
    </div>
</div>

<div class="panel">
    <div class="panel-header">
        <span>Employee Salary Details</span>
        @if($payroll->calculated_at)
            <small class="text-muted fw-normal">Calculated {{ $payroll->calculated_at->format('d M Y, h:i A') }}</small>
        @endif
    </div>
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover table-sm align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Employee</th>
                        <th class="text-center">Attendance</th>
                        <th class="text-end">Basic</th>
                        <th class="text-end">HRA</th>
                        <th class="text-end">Other</th>
                        <th class="text-end">Gross</th>
                        <th class="text-end">PT</th>
                        <th class="text-end">Deductions</th>
                        <th class="text-end">Net Salary</th>
                        <th class="text-end"></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($payroll->details as $detail)
                        <tr>
                            <td>
                                <div class="fw-semibold">{{ $detail->employee->name }}</div>
                                <small class="text-muted">{{ $detail->employee->employee_code }}</small>
                            </td>
                            <td class="text-center">
                                {{ $detail->present_days }}/{{ $detail->working_days }}
                                @if($detail->lop_days > 0)<small class="d-block text-danger">LOP: {{ $detail->lop_days }}</small>@endif
                            </td>
                            <td class="text-end">₹{{ number_format($detail->basic, 2) }}</td>
                            <td class="text-end">₹{{ number_format($detail->hra, 2) }}</td>
                            <td class="text-end">₹{{ number_format($detail->other_allowance, 2) }}</td>
                            <td class="text-end">₹{{ number_format($detail->earned_gross, 2) }}</td>
                            <td class="text-end">₹{{ number_format($detail->professional_tax, 2) }}</td>
                            <td class="text-end">₹{{ number_format($detail->total_deductions, 2) }}</td>
                            <td class="text-end fw-semibold">₹{{ number_format($detail->net_salary, 2) }}</td>
                            <td class="text-end text-nowrap">
                                <a href="{{ route('payslips.show', $detail) }}" class="btn btn-sm btn-outline-primary" title="Preview payslip"><i class="bi bi-eye"></i></a>
                                @if($payroll->isEditable())
                                    <a href="{{ route('payroll.details.edit', $detail) }}" class="btn btn-sm btn-outline-secondary" title="Edit salary"><i class="bi bi-pencil"></i></a>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="10" class="text-center text-muted py-5">
                                No salary details available. Enter attendance, then calculate payroll.
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
