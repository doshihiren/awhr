@extends('layouts.app')

@section('title', 'Edit Salary Detail')
@section('page_title', 'Edit Salary Detail')
@section('page_subtitle', $detail->employee->name . ' — ' . $detail->payroll->period_label)

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <div>
        <h1 class="page-title h4 mb-1">{{ $detail->employee->name }}</h1>
        <div class="text-muted">{{ $detail->employee->employee_code }} · {{ $detail->payroll->period_label }}</div>
    </div>
    <a href="{{ route('payroll.show', $detail->payroll) }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Back</a>
</div>

<form method="POST" action="{{ route('payroll.details.update', $detail) }}">
    @csrf
    @method('PUT')
    <div class="row g-3">
        <div class="col-lg-6">
            <div class="panel h-100">
                <div class="panel-header">Earnings</div>
                <div class="panel-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="basic" class="form-label">Basic Salary</label>
                            <div class="input-group"><span class="input-group-text">₹</span><input id="basic" type="number" step="0.01" min="0" name="basic" value="{{ old('basic', $detail->basic) }}" class="form-control @error('basic') is-invalid @enderror" required></div>
                            @error('basic')<div class="text-danger small mt-1">{{ $message }}</div>@enderror
                        </div>
                        <div class="col-md-6">
                            <label for="hra" class="form-label">HRA</label>
                            <div class="input-group"><span class="input-group-text">₹</span><input id="hra" type="number" step="0.01" min="0" name="hra" value="{{ old('hra', $detail->hra) }}" class="form-control @error('hra') is-invalid @enderror" required></div>
                            @error('hra')<div class="text-danger small mt-1">{{ $message }}</div>@enderror
                        </div>
                        <div class="col-md-6">
                            <label for="other_allowance" class="form-label">Other Allowance</label>
                            <div class="input-group"><span class="input-group-text">₹</span><input id="other_allowance" type="number" step="0.01" min="0" name="other_allowance" value="{{ old('other_allowance', $detail->other_allowance) }}" class="form-control @error('other_allowance') is-invalid @enderror" required></div>
                            @error('other_allowance')<div class="text-danger small mt-1">{{ $message }}</div>@enderror
                        </div>
                        <div class="col-md-6">
                            <label for="earned_gross" class="form-label">Earned Gross</label>
                            <div class="input-group"><span class="input-group-text">₹</span><input id="earned_gross" type="number" step="0.01" min="0" name="earned_gross" value="{{ old('earned_gross', $detail->earned_gross) }}" class="form-control @error('earned_gross') is-invalid @enderror" required></div>
                            @error('earned_gross')<div class="text-danger small mt-1">{{ $message }}</div>@enderror
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-lg-6">
            <div class="panel h-100">
                <div class="panel-header">Deductions</div>
                <div class="panel-body">
                    <div class="row g-3">
                        @foreach([
                            'professional_tax' => 'Professional Tax',
                            'pf' => 'Provident Fund',
                            'esic' => 'ESIC',
                            'tds' => 'TDS',
                            'loan' => 'Loan',
                            'advance' => 'Advance',
                            'other_deduction' => 'Other Deduction',
                        ] as $field => $label)
                            <div class="col-md-6">
                                <label for="{{ $field }}" class="form-label">{{ $label }}</label>
                                <div class="input-group">
                                    <span class="input-group-text">₹</span>
                                    <input id="{{ $field }}" type="number" step="0.01" min="0" name="{{ $field }}" value="{{ old($field, $detail->{$field}) }}" class="form-control @error($field) is-invalid @enderror" {{ $field === 'professional_tax' ? 'required' : '' }}>
                                </div>
                                @error($field)<div class="text-danger small mt-1">{{ $message }}</div>@enderror
                            </div>
                        @endforeach
                    </div>
                </div>
            </div>
        </div>
        <div class="col-12">
            <div class="panel">
                <div class="panel-body">
                    <label for="remarks" class="form-label">Remarks</label>
                    <textarea id="remarks" name="remarks" rows="3" maxlength="500" class="form-control @error('remarks') is-invalid @enderror">{{ old('remarks', $detail->remarks) }}</textarea>
                    @error('remarks')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    <div class="d-flex justify-content-end gap-2 mt-3">
                        <a href="{{ route('payroll.show', $detail->payroll) }}" class="btn btn-outline-secondary">Cancel</a>
                        <button type="submit" class="btn btn-awhr"><i class="bi bi-check-lg me-1"></i>Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>
@endsection
