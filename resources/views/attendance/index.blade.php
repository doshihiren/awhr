@extends('layouts.app')

@section('title', 'Attendance')
@section('page_title', 'Attendance')
@section('page_subtitle', 'Record and review monthly attendance')

@section('content')
<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <h1 class="page-title h4 mb-0">Attendance Register</h1>
    <form method="GET" action="{{ route('attendance.index') }}" class="d-flex gap-2">
        <select name="month" class="form-select form-select-sm" aria-label="Month">
            @foreach(range(1, 12) as $monthNumber)
                <option value="{{ $monthNumber }}" @selected($month === $monthNumber)>
                    {{ date('F', mktime(0, 0, 0, $monthNumber, 1)) }}
                </option>
            @endforeach
        </select>
        <input type="number" name="year" value="{{ $year }}" min="2000" max="2100" class="form-control form-control-sm" aria-label="Year">
        <button type="submit" class="btn btn-awhr btn-sm"><i class="bi bi-funnel me-1"></i>Filter</button>
    </form>
</div>

<div class="panel mb-4">
    <div class="panel-header">
        <span><i class="bi bi-calendar-plus me-2"></i>Add Attendance</span>
    </div>
    <div class="panel-body">
        <form method="POST" action="{{ route('attendance.store') }}" class="row g-3">
            @csrf
            <div class="col-lg-4">
                <label for="employee_id" class="form-label">Employee <span class="text-danger">*</span></label>
                <select id="employee_id" name="employee_id" class="form-select @error('employee_id') is-invalid @enderror" required>
                    <option value="">Select employee</option>
                    @foreach($employees as $employee)
                        <option value="{{ $employee->id }}" @selected(old('employee_id') == $employee->id)>
                            {{ $employee->employee_code }} — {{ $employee->name }}
                        </option>
                    @endforeach
                </select>
                @error('employee_id')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-lg-2">
                <label for="month" class="form-label">Month <span class="text-danger">*</span></label>
                <select id="month" name="month" class="form-select @error('month') is-invalid @enderror" required>
                    @foreach(range(1, 12) as $monthNumber)
                        <option value="{{ $monthNumber }}" @selected((int) old('month', $month) === $monthNumber)>
                            {{ date('F', mktime(0, 0, 0, $monthNumber, 1)) }}
                        </option>
                    @endforeach
                </select>
                @error('month')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-lg-2">
                <label for="year" class="form-label">Year <span class="text-danger">*</span></label>
                <input id="year" type="number" name="year" value="{{ old('year', $year) }}" min="2000" max="2100" class="form-control @error('year') is-invalid @enderror" required>
                @error('year')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-lg-2">
                <label for="working_days" class="form-label">Working Days <span class="text-danger">*</span></label>
                <input id="working_days" type="number" name="working_days" value="{{ old('working_days', 26) }}" min="1" max="31" class="form-control @error('working_days') is-invalid @enderror" required>
                @error('working_days')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-lg-2">
                <label for="present_days" class="form-label">Present Days <span class="text-danger">*</span></label>
                <input id="present_days" type="number" name="present_days" value="{{ old('present_days') }}" min="0" max="31" class="form-control @error('present_days') is-invalid @enderror" required>
                @error('present_days')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-lg-2">
                <label for="lop_days" class="form-label">LOP Days</label>
                <input id="lop_days" type="number" name="lop_days" value="{{ old('lop_days') }}" min="0" max="31" class="form-control @error('lop_days') is-invalid @enderror" placeholder="Auto">
                @error('lop_days')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-lg-2">
                <label for="overtime_days" class="form-label">Overtime Days</label>
                <input id="overtime_days" type="number" name="overtime_days" value="{{ old('overtime_days', 0) }}" min="0" max="31" class="form-control @error('overtime_days') is-invalid @enderror">
                @error('overtime_days')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-lg-6">
                <label for="remarks" class="form-label">Remarks</label>
                <input id="remarks" type="text" name="remarks" value="{{ old('remarks') }}" maxlength="1000" class="form-control @error('remarks') is-invalid @enderror" placeholder="Optional notes">
                @error('remarks')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-lg-2 d-flex align-items-end">
                <button type="submit" class="btn btn-awhr w-100"><i class="bi bi-check-lg me-1"></i>Save</button>
            </div>
        </form>
    </div>
</div>

<div class="panel">
    <div class="panel-header">
        <span>{{ date('F', mktime(0, 0, 0, $month, 1)) }} {{ $year }}</span>
        <span class="badge text-bg-light">{{ $attendances->total() }} records</span>
    </div>
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Employee</th>
                        <th class="text-center">Working</th>
                        <th class="text-center">Present</th>
                        <th class="text-center">LOP</th>
                        <th class="text-center">Overtime</th>
                        <th>Remarks</th>
                        <th class="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($attendances as $attendance)
                        <tr>
                            <td>
                                <div class="fw-semibold">{{ $attendance->employee->name }}</div>
                                <small class="text-muted">{{ $attendance->employee->employee_code }}</small>
                            </td>
                            <td class="text-center">{{ $attendance->working_days }}</td>
                            <td class="text-center">{{ $attendance->present_days }}</td>
                            <td class="text-center">{{ $attendance->lop_days }}</td>
                            <td class="text-center">{{ $attendance->overtime_days }}</td>
                            <td>{{ $attendance->remarks ?: '—' }}</td>
                            <td class="text-end text-nowrap">
                                <a href="{{ route('attendance.edit', $attendance) }}" class="btn btn-sm btn-outline-primary" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </a>
                                <form method="POST" action="{{ route('attendance.destroy', $attendance) }}" class="d-inline" onsubmit="return confirm('Delete this attendance record?')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="btn btn-sm btn-outline-danger" title="Delete"><i class="bi bi-trash"></i></button>
                                </form>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="text-center text-muted py-5">No attendance records found for this period.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($attendances->hasPages())
            <div class="p-3 border-top">{{ $attendances->links() }}</div>
        @endif
    </div>
</div>
@endsection
