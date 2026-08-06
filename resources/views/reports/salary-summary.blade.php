@extends('layouts.app')

@section('title', 'Salary Summary')
@section('page_title', 'Salary Summary')
@section('page_subtitle', 'Current employee salary structures')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Salary Structure Summary</h1>
    <a href="{{ route('reports.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Reports</a>
</div>

<div class="row g-3 mb-3">
    <div class="col-md-4"><div class="stat-card"><div class="stat-label">Employees</div><div class="stat-value">{{ $employees->count() }}</div></div></div>
    <div class="col-md-4"><div class="stat-card" style="border-left-color:#10b981"><div class="stat-label">Monthly Salary Cost</div><div class="stat-value">₹{{ number_format($employees->sum('monthly_salary'), 2) }}</div></div></div>
</div>

<div class="panel">
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 datatable">
                <thead class="table-light">
                    <tr><th>Code</th><th>Employee</th><th>Department</th><th>Designation</th><th class="text-end">Basic</th><th class="text-end">HRA</th><th class="text-end">Other</th><th class="text-end">Monthly Gross</th><th>Status</th></tr>
                </thead>
                <tbody>
                    @foreach($employees as $employee)
                        @php($structure = $employee->salaryStructure)
                        <tr>
                            <td>{{ $employee->employee_code }}</td>
                            <td class="fw-semibold"><a href="{{ route('employees.show', $employee) }}" class="text-decoration-none">{{ $employee->name }}</a></td>
                            <td>{{ $employee->department }}</td>
                            <td>{{ $employee->designation }}</td>
                            <td class="text-end">₹{{ number_format($structure?->basic_amount ?? 0, 2) }}</td>
                            <td class="text-end">₹{{ number_format($structure?->hra_amount ?? 0, 2) }}</td>
                            <td class="text-end">₹{{ number_format($structure?->other_allowance_amount ?? 0, 2) }}</td>
                            <td class="text-end fw-semibold">₹{{ number_format($structure?->monthly_gross ?? $employee->monthly_salary, 2) }}</td>
                            <td><span class="badge {{ $employee->status === 'active' ? 'text-bg-success' : 'text-bg-secondary' }}">{{ ucfirst($employee->status) }}</span></td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
