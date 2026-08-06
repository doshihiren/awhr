@extends('layouts.app')

@section('title', 'Daily Attendance')
@section('page_title', 'Daily Attendance')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Daily Attendance Log</h1>
    <div class="d-flex gap-2">
        <a href="{{ route('attendance.import') }}" class="btn btn-outline-primary btn-sm"><i class="bi bi-upload me-1"></i>Import</a>
        <a href="{{ route('attendance.index') }}" class="btn btn-outline-secondary btn-sm">Monthly Summary</a>
    </div>
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
            <div class="col-md-2">
                <label class="form-label">Year</label>
                <input type="number" name="year" value="{{ $year }}" class="form-control">
            </div>
            <div class="col-md-4">
                <label class="form-label">Employee</label>
                <select name="employee_id" class="form-select">
                    <option value="">All</option>
                    @foreach($employees as $e)
                        <option value="{{ $e->id }}" @selected(request('employee_id')==$e->id)>{{ $e->employee_code }} — {{ $e->name }}</option>
                    @endforeach
                </select>
            </div>
            <div class="col-md-3"><button class="btn btn-awhr">Filter</button></div>
        </form>
    </div>
</div>

<div class="panel">
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0 align-middle">
                <thead class="table-light">
                    <tr><th>Date</th><th>Employee</th><th>In</th><th>Out</th><th>Status</th><th>Late</th><th>Source</th></tr>
                </thead>
                <tbody>
                    @forelse($days as $day)
                        <tr>
                            <td>{{ $day->date->format('d M Y') }}</td>
                            <td>{{ $day->employee->name }} <small class="text-muted">({{ $day->employee->employee_code }})</small></td>
                            <td>{{ $day->check_in ? substr($day->check_in,0,5) : '—' }}</td>
                            <td>{{ $day->check_out ? substr($day->check_out,0,5) : '—' }}</td>
                            <td class="text-capitalize">{{ str_replace('_',' ',$day->status) }}</td>
                            <td>@if($day->is_late)<span class="badge text-bg-warning">{{ $day->late_minutes }} min</span>@else — @endif</td>
                            <td>{{ $day->source }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="text-center text-muted py-4">No daily records.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-3">{{ $days->links() }}</div>
    </div>
</div>
@endsection
