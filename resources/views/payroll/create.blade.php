@extends('layouts.app')

@section('title', 'Create Payroll')
@section('page_title', 'Create Payroll')
@section('page_subtitle', 'Start a payroll run for a monthly period')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">New Payroll Period</h1>
    <a href="{{ route('payroll.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Back</a>
</div>

<div class="row justify-content-center">
    <div class="col-lg-7 col-xl-6">
        <div class="panel">
            <div class="panel-header">Period Details</div>
            <div class="panel-body">
                <div class="alert alert-info d-flex gap-2" role="alert">
                    <i class="bi bi-info-circle-fill"></i>
                    <div>Attendance must be entered for employees before payroll can be calculated.</div>
                </div>
                <form method="POST" action="{{ route('payroll.store') }}" class="row g-3">
                    @csrf
                    <div class="col-md-6">
                        <label for="month" class="form-label">Month <span class="text-danger">*</span></label>
                        <select id="month" name="month" class="form-select @error('month') is-invalid @enderror" required>
                            @foreach(range(1, 12) as $monthNumber)
                                <option value="{{ $monthNumber }}" @selected((int) old('month', now()->month) === $monthNumber)>
                                    {{ date('F', mktime(0, 0, 0, $monthNumber, 1)) }}
                                </option>
                            @endforeach
                        </select>
                        @error('month')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-6">
                        <label for="year" class="form-label">Year <span class="text-danger">*</span></label>
                        <input id="year" type="number" name="year" value="{{ old('year', now()->year) }}" min="2000" max="2100" class="form-control @error('year') is-invalid @enderror" required>
                        @error('year')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-12 d-flex justify-content-end gap-2 mt-4">
                        <a href="{{ route('payroll.index') }}" class="btn btn-outline-secondary">Cancel</a>
                        <button type="submit" class="btn btn-awhr"><i class="bi bi-arrow-right-circle me-1"></i>Continue</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
