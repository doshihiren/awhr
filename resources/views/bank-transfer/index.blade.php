@extends('layouts.app')

@section('title', 'Bank Transfer')
@section('page_title', 'Bank Transfer')
@section('page_subtitle', 'Prepare salary bank transfer files')

@section('content')
<div class="mb-3">
    <h1 class="page-title h4 mb-0">Bank Transfer Sheet</h1>
</div>

<div class="panel mb-3">
    <div class="panel-body">
        <form method="GET" action="{{ route('bank-transfer.index') }}" class="row g-2 align-items-end">
            <div class="col-md-6">
                <label for="payroll_id" class="form-label">Payroll Period</label>
                <select id="payroll_id" name="payroll_id" class="form-select" required>
                    <option value="">Select a calculated payroll</option>
                    @foreach($payrolls as $option)
                        <option value="{{ $option->id }}" @selected($payroll?->id === $option->id)>
                            {{ $option->period_label }} — {{ ucfirst($option->status) }}
                        </option>
                    @endforeach
                </select>
            </div>
            <div class="col-md-3"><button type="submit" class="btn btn-awhr"><i class="bi bi-eye me-1"></i>View Sheet</button></div>
        </form>
    </div>
</div>

@if($payroll)
    <div class="row g-3 mb-3">
        <div class="col-md-4"><div class="stat-card"><div class="stat-label">Payroll Period</div><div class="stat-value fs-5">{{ $payroll->period_label }}</div></div></div>
        <div class="col-md-4"><div class="stat-card"><div class="stat-label">Employees</div><div class="stat-value">{{ $payroll->details->count() }}</div></div></div>
        <div class="col-md-4"><div class="stat-card" style="border-left-color:#10b981"><div class="stat-label">Transfer Total</div><div class="stat-value">₹{{ number_format($payroll->details->sum('net_salary'), 2) }}</div></div></div>
    </div>

    <div class="panel">
        <div class="panel-header">
            <span>Transfer Details</span>
            <div class="d-flex gap-2">
                <a href="{{ route('bank-transfer.excel', $payroll) }}" class="btn btn-sm btn-outline-success"><i class="bi bi-file-earmark-excel me-1"></i>Excel</a>
                <a href="{{ route('bank-transfer.csv', $payroll) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-filetype-csv me-1"></i>CSV</a>
            </div>
        </div>
        <div class="panel-body p-0">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light"><tr><th>Employee Name</th><th>Account Number</th><th>IFSC</th><th class="text-end">Net Salary</th></tr></thead>
                    <tbody>
                        @forelse($payroll->details as $detail)
                            <tr>
                                <td>
                                    <div class="fw-semibold">{{ $detail->employee->name }}</div>
                                    <small class="text-muted">{{ $detail->employee->employee_code }}</small>
                                </td>
                                <td>{{ $detail->employee->account_number ?: 'Not provided' }}</td>
                                <td>{{ $detail->employee->ifsc ?: 'Not provided' }}</td>
                                <td class="text-end fw-semibold">₹{{ number_format($detail->net_salary, 2) }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="4" class="text-center text-muted py-5">No salary details in this payroll.</td></tr>
                        @endforelse
                    </tbody>
                    @if($payroll->details->isNotEmpty())
                        <tfoot class="table-light fw-bold"><tr><td colspan="3">Total Transfer</td><td class="text-end">₹{{ number_format($payroll->details->sum('net_salary'), 2) }}</td></tr></tfoot>
                    @endif
                </table>
            </div>
        </div>
    </div>
@else
    <div class="panel"><div class="panel-body text-center text-muted py-5"><i class="bi bi-bank fs-1 d-block mb-2"></i>Select a payroll period to generate the bank transfer sheet.</div></div>
@endif
@endsection
