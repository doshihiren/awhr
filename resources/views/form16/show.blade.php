@extends('layouts.app')

@section('title', 'Form 16 - ' . $employee->name)
@section('page_title', 'Form 16')
@section('page_subtitle', $employee->name . ' · ' . $fy)

@section('content')
<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <div>
        <h1 class="page-title h4 mb-1">Form 16 — {{ $fy }}</h1>
        <div class="text-muted">{{ $employee->employee_code }} · {{ $employee->name }}</div>
    </div>
    <div class="d-flex gap-2">
        <a href="{{ route('form16.pdf', ['employee' => $employee, 'financial_year' => $fy]) }}" class="btn btn-awhr"><i class="bi bi-file-earmark-pdf me-1"></i>PDF</a>
        <a href="{{ route('form16.excel', ['employee' => $employee, 'financial_year' => $fy]) }}" class="btn btn-outline-success"><i class="bi bi-file-earmark-excel me-1"></i>Excel</a>
        <a href="{{ route('form16.index', ['financial_year' => $fy]) }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Back</a>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-6 col-xl">
        <div class="stat-card">
            <div class="stat-label">Salary Paid</div>
            <div class="stat-value fs-5">₹{{ number_format($data['salary_paid'], 2) }}</div>
        </div>
    </div>
    <div class="col-6 col-xl">
        <div class="stat-card" style="border-left-color:#ef4444">
            <div class="stat-label">Professional Tax</div>
            <div class="stat-value fs-5">₹{{ number_format($data['professional_tax'], 2) }}</div>
        </div>
    </div>
    <div class="col-6 col-xl">
        <div class="stat-card" style="border-left-color:#f59e0b">
            <div class="stat-label">Other Deductions</div>
            <div class="stat-value fs-5">₹{{ number_format($data['other_deductions'], 2) }}</div>
        </div>
    </div>
    <div class="col-6 col-xl">
        <div class="stat-card" style="border-left-color:#8b5cf6">
            <div class="stat-label">TDS</div>
            <div class="stat-value fs-5">₹{{ number_format($data['tds'], 2) }}</div>
        </div>
    </div>
    <div class="col-12 col-xl">
        <div class="stat-card" style="border-left-color:#10b981">
            <div class="stat-label">Taxable Income</div>
            <div class="stat-value fs-5">₹{{ number_format($data['taxable_income'], 2) }}</div>
        </div>
    </div>
</div>

@if(empty($data['has_data']))
    <div class="alert alert-warning">
        No payroll records found for <strong>{{ $fy }}</strong>.
        Process payroll (Calculate / Freeze / Approve) for months in this financial year, then reopen Form 16.
    </div>
@endif

<div class="panel mb-4">
    <div class="panel-header">Employee & Period Details</div>
    <div class="panel-body">
        <div class="row g-3">
            <div class="col-md-3"><div class="text-muted small">Employee</div><div class="fw-semibold">{{ $employee->name }}</div></div>
            <div class="col-md-3"><div class="text-muted small">Employee Code</div><div class="fw-semibold">{{ $employee->employee_code }}</div></div>
            <div class="col-md-3"><div class="text-muted small">PAN</div><div class="fw-semibold">{{ $employee->pan_number ?: 'Not provided' }}</div></div>
            <div class="col-md-3"><div class="text-muted small">Statement Period</div><div class="fw-semibold">{{ $data['period_start']->format('d M Y') }} – {{ $data['period_end']->format('d M Y') }}</div></div>
        </div>
    </div>
</div>

<div class="panel">
    <div class="panel-header">Monthly Salary Details</div>
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Month</th>
                        <th class="text-end">Gross Salary</th>
                        <th class="text-end">Professional Tax</th>
                        <th class="text-end">Other Deductions</th>
                        <th class="text-end">TDS</th>
                        <th class="text-end">Net Salary</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($data['monthly_details'] as $detail)
                        <tr>
                            <td>{{ $detail->payroll->period_label }}</td>
                            <td class="text-end">₹{{ number_format($detail->earned_gross, 2) }}</td>
                            <td class="text-end">₹{{ number_format($detail->professional_tax, 2) }}</td>
                            <td class="text-end">₹{{ number_format((float) $detail->pf + (float) $detail->esic + (float) $detail->loan + (float) $detail->advance + (float) $detail->other_deduction, 2) }}</td>
                            <td class="text-end">₹{{ number_format($detail->tds, 2) }}</td>
                            <td class="text-end fw-semibold">₹{{ number_format($detail->net_salary, 2) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="text-center text-muted py-5">No qualifying payroll records for {{ $fy }}.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
