@extends('layouts.app')

@section('title', 'My Leaves')
@section('page_title', 'My Leaves')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Leave Balance</h1>
    <form method="GET" class="d-flex gap-2">
        <select name="financial_year" class="form-select form-select-sm" onchange="this.form.submit()">
            @foreach($fyOptions as $opt)
                <option value="{{ $opt }}" @selected($fy===$opt)>{{ $opt }}</option>
            @endforeach
        </select>
    </form>
</div>

<div class="row g-3 mb-4">
    <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Opening</div><div class="stat-value fs-4">{{ $balance->opening_leave }}</div></div></div>
    <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Earned</div><div class="stat-value fs-4">{{ $balance->leaves_earned }}</div></div></div>
    <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Taken</div><div class="stat-value fs-4">{{ $balance->leaves_taken }}</div></div></div>
    <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Current Balance</div><div class="stat-value fs-4">{{ $balance->current_balance }}</div></div></div>
</div>

<div class="panel">
    <div class="panel-header">Leave History</div>
    <div class="panel-body p-0">
        <table class="table mb-0">
            <thead class="table-light"><tr><th>Date</th><th>Type</th><th>Days</th><th>Remarks</th></tr></thead>
            <tbody>
                @forelse($transactions as $tx)
                    <tr>
                        <td>{{ $tx->transaction_date->format('d M Y') }}</td>
                        <td class="text-capitalize">{{ $tx->type }}</td>
                        <td>{{ $tx->days }}</td>
                        <td>{{ $tx->remarks }}</td>
                    </tr>
                @empty
                    <tr><td colspan="4" class="text-center text-muted py-4">No leave transactions.</td></tr>
                @endforelse
            </tbody>
        </table>
        <div class="p-3">{{ $transactions->withQueryString()->links() }}</div>
    </div>
</div>
@endsection
