@extends('layouts.app')

@section('title', 'Audit Logs')
@section('page_title', 'Audit Logs')
@section('page_subtitle', 'Review user and payroll activity')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Activity Audit Log</h1>
    <span class="badge text-bg-light">{{ $logs->total() }} entries</span>
</div>

<div class="panel mb-3">
    <div class="panel-body">
        <form method="GET" action="{{ route('audit-logs.index') }}" class="row g-2 align-items-end">
            <div class="col-md-5">
                <label for="search" class="form-label">Search Description</label>
                <input id="search" type="search" name="search" value="{{ request('search') }}" class="form-control" placeholder="Search activity...">
            </div>
            <div class="col-md-3">
                <label for="action" class="form-label">Action</label>
                <select id="action" name="action" class="form-select">
                    <option value="">All actions</option>
                    @foreach($actions as $action)<option value="{{ $action }}" @selected(request('action') === $action)>{{ ucwords(str_replace('_', ' ', $action)) }}</option>@endforeach
                </select>
            </div>
            <div class="col-md-4">
                <button type="submit" class="btn btn-awhr"><i class="bi bi-funnel me-1"></i>Filter</button>
                <a href="{{ route('audit-logs.index') }}" class="btn btn-outline-secondary">Reset</a>
            </div>
        </form>
    </div>
</div>

<div class="panel">
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light"><tr><th>Date & Time</th><th>User</th><th>Action</th><th>Description</th><th>Record</th><th>IP Address</th></tr></thead>
                <tbody>
                    @forelse($logs as $log)
                        <tr>
                            <td class="text-nowrap">
                                <div>{{ $log->created_at->format('d M Y') }}</div>
                                <small class="text-muted">{{ $log->created_at->format('h:i:s A') }}</small>
                            </td>
                            <td>
                                <div class="fw-semibold">{{ $log->user?->name ?? 'System' }}</div>
                                @if($log->user)<small class="text-muted">{{ $log->user->email }}</small>@endif
                            </td>
                            <td><span class="badge text-bg-light">{{ ucwords(str_replace('_', ' ', $log->action)) }}</span></td>
                            <td>
                                {{ $log->description ?: '—' }}
                                @if($log->old_values || $log->new_values)
                                    <details class="small mt-1">
                                        <summary class="text-primary" style="cursor:pointer">View changes</summary>
                                        @if($log->old_values)<div class="mt-1"><strong>Before:</strong> <code>{{ json_encode($log->old_values, JSON_UNESCAPED_UNICODE) }}</code></div>@endif
                                        @if($log->new_values)<div class="mt-1"><strong>After:</strong> <code>{{ json_encode($log->new_values, JSON_UNESCAPED_UNICODE) }}</code></div>@endif
                                    </details>
                                @endif
                            </td>
                            <td>
                                @if($log->auditable_type)
                                    <span class="text-nowrap">{{ class_basename($log->auditable_type) }} #{{ $log->auditable_id }}</span>
                                @else
                                    —
                                @endif
                            </td>
                            <td class="text-nowrap">{{ $log->ip_address ?: '—' }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="text-center text-muted py-5">No audit log entries found.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($logs->hasPages())<div class="p-3 border-top">{{ $logs->links() }}</div>@endif
    </div>
</div>
@endsection
