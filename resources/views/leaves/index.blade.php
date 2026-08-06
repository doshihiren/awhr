@extends('layouts.app')

@section('title', 'Leave Management')
@section('page_title', 'Leave Management')
@section('page_subtitle', 'Track balances and leave activity')

@section('content')
<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <h1 class="page-title h4 mb-0">Leave Balances</h1>
    <form method="POST" action="{{ route('leaves.accrue-all') }}" onsubmit="return confirm('Accrue monthly leave for all active employees?')">
        @csrf
        <input type="hidden" name="financial_year" value="{{ $fy }}">
        <button type="submit" class="btn btn-awhr"><i class="bi bi-plus-circle me-1"></i>Accrue for All</button>
    </form>
</div>

<div class="panel mb-3">
    <div class="panel-body">
        <form method="GET" action="{{ route('leaves.index') }}" class="row g-2 align-items-end">
            <div class="col-md-5">
                <label for="search" class="form-label">Search Employee</label>
                <input id="search" type="search" name="search" value="{{ request('search') }}" class="form-control" placeholder="Employee name or code">
            </div>
            <div class="col-md-3">
                <label for="financial_year" class="form-label">Financial Year</label>
                <select id="financial_year" name="financial_year" class="form-select">
                    @foreach($fyOptions as $option)
                        <option value="{{ $option }}" @selected($fy === $option)>{{ $option }}</option>
                    @endforeach
                </select>
            </div>
            <div class="col-md-4">
                <button type="submit" class="btn btn-awhr"><i class="bi bi-funnel me-1"></i>Apply</button>
                <a href="{{ route('leaves.index') }}" class="btn btn-outline-secondary">Reset</a>
            </div>
        </form>
    </div>
</div>

<div class="panel">
    <div class="panel-header">
        <span>Financial Year {{ $fy }}</span>
        <span class="badge text-bg-light">{{ $balances->total() }} employees</span>
    </div>
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Employee</th>
                        <th class="text-center">Opening</th>
                        <th class="text-center">Earned</th>
                        <th class="text-center">Taken</th>
                        <th class="text-center">Balance</th>
                        <th class="text-end">Action</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($balances as $balance)
                        <tr>
                            <td>
                                <div class="fw-semibold">{{ $balance->employee->name }}</div>
                                <small class="text-muted">{{ $balance->employee->employee_code }}</small>
                            </td>
                            <td class="text-center">{{ number_format($balance->opening_leave, 2) }}</td>
                            <td class="text-center text-success">{{ number_format($balance->leaves_earned, 2) }}</td>
                            <td class="text-center text-danger">{{ number_format($balance->leaves_taken, 2) }}</td>
                            <td class="text-center">
                                <span class="badge {{ $balance->current_balance < 0 ? 'text-bg-danger' : 'text-bg-primary' }}">
                                    {{ number_format($balance->current_balance, 2) }}
                                </span>
                            </td>
                            <td class="text-end">
                                <a href="{{ route('leaves.show', ['employee' => $balance->employee, 'financial_year' => $fy]) }}" class="btn btn-sm btn-outline-primary">
                                    Manage <i class="bi bi-arrow-right ms-1"></i>
                                </a>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="text-center text-muted py-5">No leave balances found for this financial year.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($balances->hasPages())
            <div class="p-3 border-top">{{ $balances->links() }}</div>
        @endif
    </div>
</div>
@endsection
