@extends('layouts.app')

@section('title', 'Payslips')
@section('page_title', 'Payslips')
@section('page_subtitle', $payroll->period_label)

@section('content')
<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <h1 class="page-title h4 mb-0">Payslips — {{ $payroll->period_label }}</h1>
    <div class="d-flex gap-2">
        @if($payroll->details->isNotEmpty())
            <a href="{{ route('payslips.download-all', $payroll) }}" class="btn btn-awhr"><i class="bi bi-file-earmark-arrow-down me-1"></i>Download All</a>
        @endif
        <a href="{{ route('payroll.show', $payroll) }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Payroll</a>
    </div>
</div>

<div class="panel">
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th class="text-end">Gross Salary</th>
                        <th class="text-end">Deductions</th>
                        <th class="text-end">Net Salary</th>
                        <th class="text-center">Payment</th>
                        <th class="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($payroll->details as $detail)
                        <tr>
                            <td>
                                <div class="fw-semibold">{{ $detail->employee->name }}</div>
                                <small class="text-muted">{{ $detail->employee->employee_code }}</small>
                            </td>
                            <td>{{ $detail->employee->department }}</td>
                            <td class="text-end">₹{{ number_format($detail->earned_gross, 2) }}</td>
                            <td class="text-end">₹{{ number_format($detail->total_deductions, 2) }}</td>
                            <td class="text-end fw-semibold">₹{{ number_format($detail->net_salary, 2) }}</td>
                            <td class="text-center">
                                <span class="badge {{ $detail->is_paid ? 'text-bg-success' : 'text-bg-warning' }}">
                                    {{ $detail->is_paid ? 'Paid' : 'Pending' }}
                                </span>
                            </td>
                            <td class="text-end text-nowrap">
                                <a href="{{ route('payslips.show', $detail) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-eye me-1"></i>Preview</a>
                                <a href="{{ route('payslips.download', $detail) }}" class="btn btn-sm btn-awhr"><i class="bi bi-download me-1"></i>PDF</a>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="text-center text-muted py-5">No payslips are available for this payroll.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
