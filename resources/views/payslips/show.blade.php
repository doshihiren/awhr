@extends('layouts.app')

@section('title', 'Payslip Preview')
@section('page_title', 'Payslip Preview')
@section('page_subtitle', $detail->employee->name . ' — ' . $detail->payroll->period_label)

@section('content')
<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <h1 class="page-title h4 mb-0">Payslip Preview</h1>
    <div class="d-flex gap-2">
        <a href="{{ route('payslips.download', $detail) }}" class="btn btn-awhr"><i class="bi bi-download me-1"></i>Download PDF</a>
        <a href="{{ route('payslips.index', $detail->payroll) }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Back</a>
    </div>
</div>

<div class="panel">
    <div class="panel-body p-4 p-lg-5">
        <div class="d-flex justify-content-between align-items-start border-bottom pb-4 mb-4">
            <div class="d-flex align-items-center gap-3">
                @if($company->logo)
                    <img src="{{ asset('uploads/logos/' . $company->logo) }}" alt="{{ $company->name }}" style="max-height:64px;max-width:140px">
                @endif
                <div>
                    <h2 class="h4 text-primary fw-bold mb-1">{{ $company->name }}</h2>
                    <div class="text-muted small">{{ $company->address }}</div>
                    <div class="text-muted small">{{ $company->email }} {{ $company->phone ? '· ' . $company->phone : '' }}</div>
                </div>
            </div>
            <div class="text-end">
                <div class="text-uppercase text-muted small">Payslip for</div>
                <div class="h5 fw-bold mb-0">{{ $detail->payroll->period_label }}</div>
            </div>
        </div>

        <div class="row g-3 mb-4">
            <div class="col-md-6">
                <table class="table table-sm table-borderless mb-0">
                    <tr><th class="text-muted fw-normal ps-0" style="width:42%">Employee</th><td class="fw-semibold">{{ $detail->employee->name }}</td></tr>
                    <tr><th class="text-muted fw-normal ps-0">Employee Code</th><td>{{ $detail->employee->employee_code }}</td></tr>
                    <tr><th class="text-muted fw-normal ps-0">Department</th><td>{{ $detail->employee->department }}</td></tr>
                    <tr><th class="text-muted fw-normal ps-0">Designation</th><td>{{ $detail->employee->designation }}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <table class="table table-sm table-borderless mb-0">
                    <tr><th class="text-muted fw-normal ps-0" style="width:42%">Bank</th><td>{{ $detail->employee->bank_name ?: '—' }}</td></tr>
                    <tr><th class="text-muted fw-normal ps-0">Account Number</th><td>{{ $detail->employee->account_number ?: '—' }}</td></tr>
                    <tr><th class="text-muted fw-normal ps-0">PAN</th><td>{{ $detail->employee->pan_number ?: '—' }}</td></tr>
                    <tr><th class="text-muted fw-normal ps-0">Paid On</th><td>{{ $detail->paid_on?->format('d M Y') ?? 'Pending' }}</td></tr>
                </table>
            </div>
        </div>

        <div class="row g-4">
            <div class="col-md-7">
                <h3 class="h6 text-primary text-uppercase">Earnings</h3>
                <table class="table table-bordered">
                    <tbody>
                        <tr><td>Basic Salary</td><td class="text-end">₹{{ number_format($detail->basic, 2) }}</td></tr>
                        <tr><td>House Rent Allowance</td><td class="text-end">₹{{ number_format($detail->hra, 2) }}</td></tr>
                        <tr><td>Other Allowance</td><td class="text-end">₹{{ number_format($detail->other_allowance, 2) }}</td></tr>
                    </tbody>
                    <tfoot class="table-light"><tr><th>Gross Earnings</th><th class="text-end">₹{{ number_format($detail->earned_gross, 2) }}</th></tr></tfoot>
                </table>
            </div>
            <div class="col-md-5">
                <h3 class="h6 text-primary text-uppercase">Deductions</h3>
                <table class="table table-bordered">
                    <tbody>
                        <tr><td>Professional Tax</td><td class="text-end">₹{{ number_format($detail->professional_tax, 2) }}</td></tr>
                        @foreach(['pf' => 'PF', 'esic' => 'ESIC', 'tds' => 'TDS', 'loan' => 'Loan', 'advance' => 'Advance', 'other_deduction' => 'Other'] as $field => $label)
                            @if((float) $detail->{$field} > 0)
                                <tr><td>{{ $label }}</td><td class="text-end">₹{{ number_format($detail->{$field}, 2) }}</td></tr>
                            @endif
                        @endforeach
                    </tbody>
                    <tfoot class="table-light"><tr><th>Total Deductions</th><th class="text-end">₹{{ number_format($detail->total_deductions, 2) }}</th></tr></tfoot>
                </table>
            </div>
        </div>

        <div class="bg-primary-subtle border border-primary-subtle rounded p-3 d-flex justify-content-between align-items-center mb-4">
            <span class="fw-semibold">Net Salary Payable</span>
            <span class="h4 text-primary fw-bold mb-0">₹{{ number_format($detail->net_salary, 2) }}</span>
        </div>

        <div class="row g-3 small">
            <div class="col-md-4"><span class="text-muted">Attendance:</span> {{ $detail->present_days }}/{{ $detail->working_days }} days</div>
            <div class="col-md-4"><span class="text-muted">LOP:</span> {{ $detail->lop_days }} days</div>
            <div class="col-md-4"><span class="text-muted">Leave Balance:</span> {{ number_format($detail->leave_balance, 2) }} days</div>
        </div>
        <div class="text-center text-muted small border-top pt-3 mt-4">This is a computer-generated payslip.</div>
    </div>
</div>
@endsection
