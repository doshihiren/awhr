@extends('layouts.app')

@section('title', 'Employee Ledger')
@section('page_title', 'Employee Ledger')
@section('page_subtitle', 'Employee payroll history')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Employee Salary Ledger</h1>
    <a href="{{ route('reports.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Reports</a>
</div>

<div class="panel mb-3">
    <div class="panel-body">
        <form id="employeeLedgerForm" method="GET" data-base-url="{{ url('/reports/employee-ledger') }}" class="row g-2 align-items-end">
            <div class="col-md-6">
                <label for="employee_id" class="form-label">Employee</label>
                <select id="employee_id" class="form-select" required>
                    <option value="">Select employee</option>
                    @foreach($employees as $employee)
                        <option value="{{ $employee->id }}" @selected($selected?->id === $employee->id)>{{ $employee->employee_code }} — {{ $employee->name }}</option>
                    @endforeach
                </select>
            </div>
            <div class="col-md-3"><button type="submit" class="btn btn-awhr"><i class="bi bi-search me-1"></i>View Ledger</button></div>
        </form>
    </div>
</div>

@if($selected)
    <div class="row g-3 mb-3">
        <div class="col-md-4">
            <div class="stat-card"><div class="stat-label">Employee</div><div class="stat-value fs-5">{{ $selected->name }}</div><small class="text-muted">{{ $selected->employee_code }}</small></div>
        </div>
        <div class="col-md-4"><div class="stat-card"><div class="stat-label">Gross Paid</div><div class="stat-value">₹{{ number_format($details->sum('earned_gross'), 2) }}</div></div></div>
        <div class="col-md-4"><div class="stat-card" style="border-left-color:#10b981"><div class="stat-label">Net Paid</div><div class="stat-value">₹{{ number_format($details->sum('net_salary'), 2) }}</div></div></div>
    </div>

    <div class="panel">
        <div class="panel-header">Payroll History</div>
        <div class="panel-body p-0">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light"><tr><th>Period</th><th class="text-center">Attendance</th><th class="text-end">Gross</th><th class="text-end">Deductions</th><th class="text-end">Net Salary</th><th>Payroll Status</th><th>Payment</th><th></th></tr></thead>
                    <tbody>
                        @forelse($details as $detail)
                            <tr>
                                <td class="fw-semibold">{{ $detail->payroll->period_label }}</td>
                                <td class="text-center">{{ $detail->present_days }}/{{ $detail->working_days }}</td>
                                <td class="text-end">₹{{ number_format($detail->earned_gross, 2) }}</td>
                                <td class="text-end">₹{{ number_format($detail->total_deductions, 2) }}</td>
                                <td class="text-end fw-semibold">₹{{ number_format($detail->net_salary, 2) }}</td>
                                <td><span class="badge badge-status-{{ $detail->payroll->status }}">{{ ucfirst($detail->payroll->status) }}</span></td>
                                <td><span class="badge {{ $detail->is_paid ? 'text-bg-success' : 'text-bg-warning' }}">{{ $detail->is_paid ? 'Paid' : 'Pending' }}</span></td>
                                <td class="text-end"><a href="{{ route('payslips.show', $detail) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-eye"></i></a></td>
                            </tr>
                        @empty
                            <tr><td colspan="8" class="text-center text-muted py-5">No payroll entries found for this employee.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
@else
    <div class="panel"><div class="panel-body text-center text-muted py-5"><i class="bi bi-person-lines-fill fs-1 d-block mb-2"></i>Select an employee to view their salary ledger.</div></div>
@endif
@endsection

@push('scripts')
<script>
document.getElementById('employeeLedgerForm').addEventListener('submit', function (event) {
    const employeeId = document.getElementById('employee_id').value;
    if (!employeeId) {
        event.preventDefault();
        return;
    }
    this.action = this.dataset.baseUrl + '/' + encodeURIComponent(employeeId);
});
</script>
@endpush
