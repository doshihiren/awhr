@extends('layouts.app')

@section('title', 'Professional Tax Report')
@section('page_title', 'Professional Tax')
@section('page_subtitle', 'Monthly professional tax deduction statement')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Professional Tax Report</h1>
    <a href="{{ route('reports.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Reports</a>
</div>

<div class="panel mb-3">
    <div class="panel-body">
        <form method="GET" action="{{ route('reports.professional-tax') }}" class="row g-2 align-items-end">
            <div class="col-md-3">
                <label for="month" class="form-label">Month</label>
                <select id="month" name="month" class="form-select">
                    @foreach(range(1, 12) as $monthNumber)<option value="{{ $monthNumber }}" @selected($month === $monthNumber)>{{ date('F', mktime(0, 0, 0, $monthNumber, 1)) }}</option>@endforeach
                </select>
            </div>
            <div class="col-md-3">
                <label for="year" class="form-label">Year</label>
                <input id="year" type="number" name="year" value="{{ $year }}" min="2000" max="2100" class="form-control">
            </div>
            <div class="col-md-6 d-flex gap-2">
                <button type="submit" class="btn btn-awhr"><i class="bi bi-funnel me-1"></i>View</button>
                <a href="{{ route('reports.professional-tax', ['month' => $month, 'year' => $year, 'export' => 'excel']) }}" class="btn btn-outline-success"><i class="bi bi-file-earmark-excel me-1"></i>Excel</a>
            </div>
        </form>
    </div>
</div>

<div class="row g-3 mb-3">
    <div class="col-md-4">
        <div class="stat-card"><div class="stat-label">Employees Deducted</div><div class="stat-value">{{ $details->count() }}</div></div>
    </div>
    <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#ef4444"><div class="stat-label">Total Professional Tax</div><div class="stat-value">₹{{ number_format($details->sum('professional_tax'), 2) }}</div></div>
    </div>
</div>

<div class="panel">
    <div class="panel-header">{{ date('F', mktime(0, 0, 0, $month, 1)) }} {{ $year }}</div>
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light"><tr><th>Code</th><th>Employee</th><th>Department</th><th class="text-end">Gross Salary</th><th class="text-end">Professional Tax</th></tr></thead>
                <tbody>
                    @forelse($details as $detail)
                        <tr>
                            <td>{{ $detail->employee->employee_code }}</td>
                            <td class="fw-semibold">{{ $detail->employee->name }}</td>
                            <td>{{ $detail->employee->department }}</td>
                            <td class="text-end">₹{{ number_format($detail->earned_gross, 2) }}</td>
                            <td class="text-end fw-semibold">₹{{ number_format($detail->professional_tax, 2) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="text-center text-muted py-5">No professional tax deductions found for this period.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
