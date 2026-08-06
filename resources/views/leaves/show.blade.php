@extends('layouts.app')

@section('title', 'Employee Leave')
@section('page_title', 'Employee Leave')
@section('page_subtitle', $employee->name . ' — ' . $fy)

@section('content')
<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <div>
        <h1 class="page-title h4 mb-1">{{ $employee->name }}</h1>
        <div class="text-muted">{{ $employee->employee_code }} · {{ $employee->department }}</div>
    </div>
    <div class="d-flex gap-2">
        <form method="GET" action="{{ route('leaves.show', $employee) }}">
            <select name="financial_year" class="form-select" onchange="this.form.submit()" aria-label="Financial year">
                @foreach($fyOptions as $option)
                    <option value="{{ $option }}" @selected($fy === $option)>{{ $option }}</option>
                @endforeach
            </select>
        </form>
        <a href="{{ route('leaves.index', ['financial_year' => $fy]) }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Back</a>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-6 col-xl-3">
        <div class="stat-card">
            <div class="stat-label">Opening Leave</div>
            <div class="stat-value">{{ number_format($balance->opening_leave, 2) }}</div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card" style="border-left-color:#10b981">
            <div class="stat-label">Leave Earned</div>
            <div class="stat-value">{{ number_format($balance->leaves_earned, 2) }}</div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card" style="border-left-color:#ef4444">
            <div class="stat-label">Leave Taken</div>
            <div class="stat-value">{{ number_format($balance->leaves_taken, 2) }}</div>
        </div>
    </div>
    <div class="col-6 col-xl-3">
        <div class="stat-card" style="border-left-color:#8b5cf6">
            <div class="stat-label">Current Balance</div>
            <div class="stat-value {{ $balance->current_balance < 0 ? 'text-danger' : '' }}">{{ number_format($balance->current_balance, 2) }}</div>
        </div>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-lg-7">
        <div class="panel h-100">
            <div class="panel-header">Adjust Balance</div>
            <div class="panel-body">
                <form method="POST" action="{{ route('leaves.adjust', $employee) }}" class="row g-3">
                    @csrf
                    <input type="hidden" name="financial_year" value="{{ $fy }}">
                    <div class="col-md-4">
                        <label for="opening_leave" class="form-label">Opening Leave</label>
                        <input id="opening_leave" type="number" step="0.5" name="opening_leave" value="{{ old('opening_leave', $balance->opening_leave) }}" class="form-control @error('opening_leave') is-invalid @enderror" required>
                        @error('opening_leave')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-4">
                        <label for="leaves_earned" class="form-label">Leaves Earned</label>
                        <input id="leaves_earned" type="number" step="0.5" min="0" name="leaves_earned" value="{{ old('leaves_earned', $balance->leaves_earned) }}" class="form-control @error('leaves_earned') is-invalid @enderror" required>
                        @error('leaves_earned')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-4">
                        <label for="leaves_taken" class="form-label">Leaves Taken</label>
                        <input id="leaves_taken" type="number" step="0.5" min="0" name="leaves_taken" value="{{ old('leaves_taken', $balance->leaves_taken) }}" class="form-control @error('leaves_taken') is-invalid @enderror" required>
                        @error('leaves_taken')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-12">
                        <label for="adjust_remarks" class="form-label">Remarks</label>
                        <textarea id="adjust_remarks" name="remarks" rows="2" maxlength="500" class="form-control" placeholder="Reason for adjustment">{{ old('remarks') }}</textarea>
                    </div>
                    <div class="col-12 text-end">
                        <button type="submit" class="btn btn-awhr"><i class="bi bi-check-lg me-1"></i>Save Adjustment</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <div class="col-lg-5">
        <div class="panel h-100">
            <div class="panel-header">Record Leave Taken</div>
            <div class="panel-body">
                <form method="POST" action="{{ route('leaves.take', $employee) }}" class="row g-3">
                    @csrf
                    <input type="hidden" name="financial_year" value="{{ $fy }}">
                    <div class="col-12">
                        <label for="days" class="form-label">Number of Days</label>
                        <input id="days" type="number" step="0.5" min="0.5" name="days" value="{{ old('days') }}" class="form-control @error('days') is-invalid @enderror" required>
                        @error('days')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-12">
                        <label for="take_remarks" class="form-label">Remarks</label>
                        <textarea id="take_remarks" name="remarks" rows="2" maxlength="500" class="form-control" placeholder="Leave reason">{{ old('remarks') }}</textarea>
                    </div>
                    <div class="col-12 text-end">
                        <button type="submit" class="btn btn-awhr"><i class="bi bi-calendar-minus me-1"></i>Record Leave</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<div class="panel">
    <div class="panel-header">Transaction History</div>
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th class="text-end">Days</th>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($transactions as $transaction)
                        <tr>
                            <td>{{ $transaction->transaction_date->format('d M Y') }}</td>
                            <td><span class="badge text-bg-light">{{ ucfirst(str_replace('_', ' ', $transaction->type)) }}</span></td>
                            <td class="text-end fw-semibold {{ in_array($transaction->type, ['taken', 'deduction']) ? 'text-danger' : 'text-success' }}">
                                {{ number_format($transaction->days, 2) }}
                            </td>
                            <td>{{ $transaction->remarks ?: '—' }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="4" class="text-center text-muted py-5">No leave transactions for {{ $fy }}.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($transactions->hasPages())
            <div class="p-3 border-top">{{ $transactions->links() }}</div>
        @endif
    </div>
</div>
@endsection
