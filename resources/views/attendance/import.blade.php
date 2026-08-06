@extends('layouts.app')

@section('title', 'Import Attendance')
@section('page_title', 'Import Attendance')
@section('page_subtitle', 'From 1 April (' . $fy . ')')

@section('content')
<div class="mb-3">
    <h1 class="page-title h4 mb-1">Bulk Attendance Import</h1>
    <p class="text-muted mb-0">Financial year starts <strong>{{ $fyStart->format('d M Y') }}</strong>. Download a template, fill from 1 April, then upload.</p>
</div>

<div class="row g-3 mb-4">
    <div class="col-lg-6">
        <div class="panel h-100">
            <div class="panel-header">Daily Format (recommended for check-in history)</div>
            <div class="panel-body">
                <p class="small text-muted">Use this to load attendance day-by-day from 1 April.</p>
                <div class="table-responsive mb-3">
                    <table class="table table-sm table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th>employee_code</th><th>date</th><th>status</th><th>check_in</th><th>check_out</th><th>remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>EMP001</td><td>2026-04-01</td><td>present</td><td>09:30</td><td>18:30</td><td></td></tr>
                            <tr><td>EMP001</td><td>2026-04-02</td><td>present</td><td>10:05</td><td>18:30</td><td>Late</td></tr>
                            <tr><td>EMP001</td><td>2026-04-05</td><td>week_off</td><td></td><td></td><td>Sunday</td></tr>
                            <tr><td>EMP001</td><td>2026-04-06</td><td>leave</td><td></td><td></td><td>Casual leave</td></tr>
                        </tbody>
                    </table>
                </div>
                <p class="small mb-2"><strong>status values:</strong> present, absent, half_day, leave, holiday, week_off</p>
                <p class="small mb-3"><strong>date format:</strong> YYYY-MM-DD (example: 2026-04-01)</p>
                <a href="{{ route('attendance.template.daily') }}" class="btn btn-outline-primary"><i class="bi bi-download me-1"></i>Download Daily CSV Template</a>
            </div>
        </div>
    </div>
    <div class="col-lg-6">
        <div class="panel h-100">
            <div class="panel-header">Monthly Format (for payroll summary)</div>
            <div class="panel-body">
                <p class="small text-muted">Use this if you only have monthly totals (working / present / LOP).</p>
                <div class="table-responsive mb-3">
                    <table class="table table-sm table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th>employee_code</th><th>month</th><th>year</th><th>working_days</th><th>present_days</th><th>lop_days</th><th>late_days</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>EMP001</td><td>4</td><td>2026</td><td>22</td><td>20</td><td>2</td><td>1</td></tr>
                            <tr><td>EMP002</td><td>4</td><td>2026</td><td>22</td><td>22</td><td>0</td><td>0</td></tr>
                        </tbody>
                    </table>
                </div>
                <p class="small mb-3">Month <strong>4</strong> = April (start of FY). Repeat rows for May=5, June=6, … March=3 of next year.</p>
                <a href="{{ route('attendance.template.monthly') }}" class="btn btn-outline-primary"><i class="bi bi-download me-1"></i>Download Monthly CSV Template</a>
            </div>
        </div>
    </div>
</div>

<div class="panel">
    <div class="panel-header">Upload File</div>
    <div class="panel-body">
        <form method="POST" action="{{ route('attendance.import.store') }}" enctype="multipart/form-data" class="row g-3 align-items-end">
            @csrf
            <div class="col-md-4">
                <label class="form-label">Import Type</label>
                <select name="type" class="form-select" required>
                    <option value="daily">Daily attendance</option>
                    <option value="monthly">Monthly summary</option>
                </select>
            </div>
            <div class="col-md-5">
                <label class="form-label">CSV / Excel file</label>
                <input type="file" name="file" class="form-control" accept=".csv,.txt,.xlsx,.xls" required>
            </div>
            <div class="col-md-3">
                <button class="btn btn-awhr w-100" type="submit"><i class="bi bi-upload me-1"></i>Import</button>
            </div>
        </form>

        @if(session('import_errors'))
            <div class="alert alert-warning mt-3 mb-0">
                <strong>Some rows had issues:</strong>
                <ul class="mb-0 mt-2">
                    @foreach(session('import_errors') as $err)
                        <li>{{ $err }}</li>
                    @endforeach
                </ul>
            </div>
        @endif
    </div>
</div>
@endsection
