@extends('layouts.app')

@section('title', 'My Attendance')
@section('page_title', 'My Attendance')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Attendance</h1>
    <a href="{{ route('portal.dashboard') }}" class="btn btn-outline-secondary btn-sm">Back</a>
</div>

<div class="panel mb-3">
    <div class="panel-body">
        <form method="GET" class="row g-2 align-items-end">
            <div class="col-md-3">
                <label class="form-label">Month</label>
                <select name="month" class="form-select">
                    @for($m=1;$m<=12;$m++)
                        <option value="{{ $m }}" @selected($month==$m)>{{ date('F', mktime(0,0,0,$m,1)) }}</option>
                    @endfor
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">Year</label>
                <input type="number" name="year" class="form-control" value="{{ $year }}">
            </div>
            <div class="col-md-3"><button class="btn btn-awhr">Filter</button></div>
        </form>
    </div>
</div>

@if($summary)
<div class="row g-3 mb-3">
    <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Working Days</div><div class="stat-value fs-4">{{ $summary->working_days }}</div></div></div>
    <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Present</div><div class="stat-value fs-4">{{ $summary->present_days }}</div></div></div>
    <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">LOP</div><div class="stat-value fs-4">{{ $summary->lop_days }}</div></div></div>
    <div class="col-6 col-md-3"><div class="stat-card"><div class="stat-label">Late Days</div><div class="stat-value fs-4">{{ $summary->late_days }}</div></div></div>
</div>
@endif

<div class="panel">
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead class="table-light"><tr><th>Date</th><th>Day</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th><th>Late</th><th>Remarks</th></tr></thead>
                <tbody>
                    @forelse($days as $day)
                        <tr>
                            <td>{{ $day->date->format('d M Y') }}</td>
                            <td>{{ $day->date->format('D') }}</td>
                            <td>{{ $day->check_in ? substr($day->check_in,0,5) : '—' }}</td>
                            <td>{{ $day->check_out ? substr($day->check_out,0,5) : '—' }}</td>
                            <td>{{ $day->worked_hours !== null ? $day->worked_hours.'h' : '—' }}</td>
                            <td class="text-capitalize">{{ str_replace('_',' ',$day->status) }}</td>
                            <td>@if($day->is_late)<span class="badge text-bg-warning">{{ $day->late_minutes }} min</span>@else — @endif</td>
                            <td>{{ $day->remarks ?: '—' }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="8" class="text-center text-muted py-4">No daily records for this month.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
