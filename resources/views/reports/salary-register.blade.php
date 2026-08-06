@extends('layouts.app')

@section('title', 'Salary Register')
@section('page_title', 'Salary Register')
@section('page_subtitle', 'Monthly employee salary statement')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Salary Register</h1>
    <a href="{{ route('reports.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Reports</a>
</div>

<div class="panel mb-3">
    <div class="panel-body">
        <form method="GET" action="{{ route('reports.salary-register') }}" class="row g-2 align-items-end">
            <div class="col-md-3">
                <label for="month" class="form-label">Month</label>
                <select id="month" name="month" class="form-select">
                    @foreach(range(1, 12) as $monthNumber)
                        <option value="{{ $monthNumber }}" @selected($month === $monthNumber)>{{ date('F', mktime(0, 0, 0, $monthNumber, 1)) }}</option>
                    @endforeach
                </select>
            </div>
            <div class="col-md-3">
                <label for="year" class="form-label">Year</label>
                <input id="year" type="number" name="year" value="{{ $year }}" min="2000" max="2100" class="form-control">
            </div>
            <div class="col-md-6 d-flex flex-wrap gap-2">
                <button type="submit" class="btn btn-awhr"><i class="bi bi-funnel me-1"></i>View</button>
                <a href="{{ route('reports.salary-register', ['month' => $month, 'year' => $year, 'export' => 'excel']) }}" class="btn btn-outline-success"><i class="bi bi-file-earmark-excel me-1"></i>Excel</a>
                <a href="{{ route('reports.salary-register', ['month' => $month, 'year' => $year, 'export' => 'pdf']) }}" class="btn btn-outline-danger"><i class="bi bi-file-earmark-pdf me-1"></i>PDF</a>
            </div>
        </form>
    </div>
</div>

<div class="panel">
    <div class="panel-header">
        <span>{{ date('F', mktime(0, 0, 0, $month, 1)) }} {{ $year }}</span>
        @if($payroll)<span class="badge badge-status-{{ $payroll->status }}">{{ ucfirst($payroll->status) }}</span>@endif
    </div>
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover table-sm align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Code</th><th>Employee</th><th>Department</th>
                        <th class="text-center">Working</th><th class="text-center">Present</th>
                        <th class="text-end">Gross</th><th class="text-end">PT</th>
                        <th class="text-end">Deductions</th><th class="text-end">Net Salary</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($rows as $detail)
                        <tr>
                            <td>{{ $detail->employee->employee_code }}</td>
                            <td class="fw-semibold">{{ $detail->employee->name }}</td>
                            <td>{{ $detail->employee->department }}</td>
                            <td class="text-center">{{ $detail->working_days }}</td>
                            <td class="text-center">{{ $detail->present_days }}</td>
                            <td class="text-end">₹{{ number_format($detail->earned_gross, 2) }}</td>
                            <td class="text-end">₹{{ number_format($detail->professional_tax, 2) }}</td>
                            <td class="text-end">₹{{ number_format($detail->total_deductions, 2) }}</td>
                            <td class="text-end fw-semibold">₹{{ number_format($detail->net_salary, 2) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="9" class="text-center text-muted py-5">No payroll data found for this period.</td></tr>
                    @endforelse
                </tbody>
                @if($rows->isNotEmpty())
                    <tfoot class="table-light fw-bold">
                        <tr>
                            <td colspan="5">Total</td>
                            <td class="text-end">₹{{ number_format($rows->sum('earned_gross'), 2) }}</td>
                            <td class="text-end">₹{{ number_format($rows->sum('professional_tax'), 2) }}</td>
                            <td class="text-end">₹{{ number_format($rows->sum('total_deductions'), 2) }}</td>
                            <td class="text-end">₹{{ number_format($rows->sum('net_salary'), 2) }}</td>
                        </tr>
                    </tfoot>
                @endif
            </table>
        </div>
    </div>
</div>
@endsection
