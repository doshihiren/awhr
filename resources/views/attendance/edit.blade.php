@extends('layouts.app')

@section('title', 'Edit Attendance')
@section('page_title', 'Edit Attendance')
@section('page_subtitle', $attendance->employee->name . ' — ' . $attendance->period_label)

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Update Attendance</h1>
    <a href="{{ route('attendance.index', ['month' => $attendance->month, 'year' => $attendance->year]) }}" class="btn btn-outline-secondary">
        <i class="bi bi-arrow-left me-1"></i>Back
    </a>
</div>

<div class="panel">
    <div class="panel-header">Attendance Details</div>
    <div class="panel-body">
        <form method="POST" action="{{ route('attendance.update', $attendance) }}" class="row g-3">
            @csrf
            @method('PUT')
            <div class="col-md-6">
                <label for="employee_id" class="form-label">Employee <span class="text-danger">*</span></label>
                <select id="employee_id" name="employee_id" class="form-select @error('employee_id') is-invalid @enderror" required>
                    @foreach($employees as $employee)
                        <option value="{{ $employee->id }}" @selected((int) old('employee_id', $attendance->employee_id) === $employee->id)>
                            {{ $employee->employee_code }} — {{ $employee->name }}
                        </option>
                    @endforeach
                </select>
                @error('employee_id')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-md-3">
                <label for="month" class="form-label">Month <span class="text-danger">*</span></label>
                <select id="month" name="month" class="form-select @error('month') is-invalid @enderror" required>
                    @foreach(range(1, 12) as $monthNumber)
                        <option value="{{ $monthNumber }}" @selected((int) old('month', $attendance->month) === $monthNumber)>
                            {{ date('F', mktime(0, 0, 0, $monthNumber, 1)) }}
                        </option>
                    @endforeach
                </select>
                @error('month')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-md-3">
                <label for="year" class="form-label">Year <span class="text-danger">*</span></label>
                <input id="year" type="number" name="year" value="{{ old('year', $attendance->year) }}" min="2000" max="2100" class="form-control @error('year') is-invalid @enderror" required>
                @error('year')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-md-3">
                <label for="working_days" class="form-label">Working Days <span class="text-danger">*</span></label>
                <input id="working_days" type="number" name="working_days" value="{{ old('working_days', $attendance->working_days) }}" min="1" max="31" class="form-control @error('working_days') is-invalid @enderror" required>
                @error('working_days')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-md-3">
                <label for="present_days" class="form-label">Present Days <span class="text-danger">*</span></label>
                <input id="present_days" type="number" name="present_days" value="{{ old('present_days', $attendance->present_days) }}" min="0" max="31" class="form-control @error('present_days') is-invalid @enderror" required>
                @error('present_days')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-md-3">
                <label for="lop_days" class="form-label">LOP Days</label>
                <input id="lop_days" type="number" name="lop_days" value="{{ old('lop_days', $attendance->lop_days) }}" min="0" max="31" class="form-control @error('lop_days') is-invalid @enderror">
                @error('lop_days')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-6 col-md-3">
                <label for="overtime_days" class="form-label">Overtime Days</label>
                <input id="overtime_days" type="number" name="overtime_days" value="{{ old('overtime_days', $attendance->overtime_days) }}" min="0" max="31" class="form-control @error('overtime_days') is-invalid @enderror">
                @error('overtime_days')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-12">
                <label for="remarks" class="form-label">Remarks</label>
                <textarea id="remarks" name="remarks" rows="3" maxlength="1000" class="form-control @error('remarks') is-invalid @enderror">{{ old('remarks', $attendance->remarks) }}</textarea>
                @error('remarks')<div class="invalid-feedback">{{ $message }}</div>@enderror
            </div>
            <div class="col-12 d-flex justify-content-end gap-2">
                <a href="{{ route('attendance.index', ['month' => $attendance->month, 'year' => $attendance->year]) }}" class="btn btn-outline-secondary">Cancel</a>
                <button type="submit" class="btn btn-awhr"><i class="bi bi-check-lg me-1"></i>Update Attendance</button>
            </div>
        </form>
    </div>
</div>
@endsection
