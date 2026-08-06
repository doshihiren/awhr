@extends('layouts.app')

@section('title', 'Leave Report')
@section('page_title', 'Leave Report')
@section('page_subtitle', 'Financial-year employee leave balances')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Leave Report</h1>
    <a href="{{ route('reports.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Reports</a>
</div>

<div class="panel mb-3">
    <div class="panel-body">
        <form method="GET" action="{{ route('reports.leave') }}" class="row g-2 align-items-end">
            <div class="col-md-4">
                <label for="financial_year" class="form-label">Financial Year</label>
                <select id="financial_year" name="financial_year" class="form-select">
                    @foreach($fyOptions as $option)<option value="{{ $option }}" @selected($fy === $option)>{{ $option }}</option>@endforeach
                </select>
            </div>
            <div class="col-md-5 d-flex gap-2">
                <button type="submit" class="btn btn-awhr"><i class="bi bi-funnel me-1"></i>View</button>
                <a href="{{ route('reports.leave', ['financial_year' => $fy, 'export' => 'excel']) }}" class="btn btn-outline-success"><i class="bi bi-file-earmark-excel me-1"></i>Excel</a>
            </div>
        </form>
    </div>
</div>

<div class="panel">
    <div class="panel-header"><span>Leave Balances — {{ $fy }}</span><span class="badge text-bg-light">{{ $balances->count() }} employees</span></div>
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light"><tr><th>Code</th><th>Employee</th><th>Department</th><th class="text-end">Opening</th><th class="text-end">Earned</th><th class="text-end">Taken</th><th class="text-end">Balance</th></tr></thead>
                <tbody>
                    @forelse($balances as $balance)
                        <tr>
                            <td>{{ $balance->employee->employee_code }}</td>
                            <td class="fw-semibold"><a href="{{ route('leaves.show', ['employee' => $balance->employee, 'financial_year' => $fy]) }}" class="text-decoration-none">{{ $balance->employee->name }}</a></td>
                            <td>{{ $balance->employee->department }}</td>
                            <td class="text-end">{{ number_format($balance->opening_leave, 2) }}</td>
                            <td class="text-end text-success">{{ number_format($balance->leaves_earned, 2) }}</td>
                            <td class="text-end text-danger">{{ number_format($balance->leaves_taken, 2) }}</td>
                            <td class="text-end fw-semibold {{ $balance->current_balance < 0 ? 'text-danger' : '' }}">{{ number_format($balance->current_balance, 2) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="text-center text-muted py-5">No leave balances found for {{ $fy }}.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
