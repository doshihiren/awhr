@php
    $isEdit = !empty($employee);
    $action = $isEdit ? route('employees.update', $employee) : route('employees.store');
@endphp

<div class="mb-3">
    <a href="{{ route('employees.index') }}" class="text-decoration-none"><i class="bi bi-arrow-left"></i> Back</a>
    <h1 class="page-title h4 mt-2">{{ $isEdit ? 'Edit Employee' : 'Add Employee' }}</h1>
</div>

<form method="POST" action="{{ $action }}" enctype="multipart/form-data">
    @csrf
    @if($isEdit) @method('PUT') @endif

    <div class="row g-3">
        <div class="col-lg-8">
            <div class="panel mb-3">
                <div class="panel-header">Personal Details</div>
                <div class="panel-body">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label">Employee Code *</label>
                            <input type="text" name="employee_code" class="form-control" value="{{ old('employee_code', $employee?->employee_code ?? '') }}" required>
                        </div>
                        <div class="col-md-8">
                            <label class="form-label">Employee Name *</label>
                            <input type="text" name="name" class="form-control" value="{{ old('name', $employee?->name ?? '') }}" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Gender</label>
                            <select name="gender" class="form-select">
                                <option value="">Select</option>
                                @foreach(['male','female','other'] as $g)
                                    <option value="{{ $g }}" @selected(old('gender', $employee?->gender ?? '') === $g)>{{ ucfirst($g) }}</option>
                                @endforeach
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Date of Birth</label>
                            <input type="date" name="dob" class="form-control" value="{{ old('dob', isset($employee) && $employee->dob ? $employee->dob->format('Y-m-d') : '') }}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Joining Date *</label>
                            <input type="date" name="joining_date" class="form-control" value="{{ old('joining_date', isset($employee) && $employee->joining_date ? $employee->joining_date->format('Y-m-d') : '') }}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Department</label>
                            <input type="text" name="department" class="form-control" value="{{ old('department', $employee?->department ?? '') }}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Designation</label>
                            <input type="text" name="designation" class="form-control" value="{{ old('designation', $employee?->designation ?? '') }}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Mobile</label>
                            <input type="text" name="mobile" class="form-control" value="{{ old('mobile', $employee?->mobile ?? '') }}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Email</label>
                            <input type="email" name="email" class="form-control" value="{{ old('email', $employee?->email ?? '') }}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Photo</label>
                            <input type="file" name="photo" class="form-control" accept="image/*">
                        </div>
                        <div class="col-12">
                            <label class="form-label">Address</label>
                            <textarea name="address" class="form-control" rows="2">{{ old('address', $employee?->address ?? '') }}</textarea>
                        </div>
                    </div>
                </div>
            </div>

            <div class="panel mb-3">
                <div class="panel-header">Statutory & Bank Details</div>
                <div class="panel-body">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label">PAN Number</label>
                            <input type="text" name="pan_number" class="form-control text-uppercase" maxlength="10" value="{{ old('pan_number', $employee?->pan_number ?? '') }}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Aadhaar Number</label>
                            <input type="text" name="aadhaar_number" class="form-control" maxlength="12" value="{{ old('aadhaar_number', $employee?->aadhaar_number ?? '') }}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">UAN</label>
                            <input type="text" name="uan" class="form-control" value="{{ old('uan', $employee?->uan ?? '') }}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">ESIC Number</label>
                            <input type="text" name="esic_number" class="form-control" value="{{ old('esic_number', $employee?->esic_number ?? '') }}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Bank Name</label>
                            <input type="text" name="bank_name" class="form-control" value="{{ old('bank_name', $employee?->bank_name ?? '') }}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Account Number</label>
                            <input type="text" name="account_number" class="form-control" value="{{ old('account_number', $employee?->account_number ?? '') }}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">IFSC</label>
                            <input type="text" name="ifsc" class="form-control text-uppercase" value="{{ old('ifsc', $employee?->ifsc ?? '') }}">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-lg-4">
            <div class="panel mb-3">
                <div class="panel-header">Salary Structure</div>
                <div class="panel-body">
                    <div class="mb-3">
                        <label class="form-label">Monthly Gross Salary *</label>
                        <input type="number" step="0.01" min="0" name="monthly_salary" class="form-control" value="{{ old('monthly_salary', $employee?->monthly_salary ?? '') }}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Basic %</label>
                        <input type="number" step="0.01" name="basic_percent" class="form-control" value="{{ old('basic_percent', $percents['basic_percent']) }}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">HRA %</label>
                        <input type="number" step="0.01" name="hra_percent" class="form-control" value="{{ old('hra_percent', $percents['hra_percent']) }}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Other Allowance %</label>
                        <input type="number" step="0.01" name="other_allowance_percent" class="form-control" value="{{ old('other_allowance_percent', $percents['other_allowance_percent']) }}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Status *</label>
                        <select name="status" class="form-select" required>
                            <option value="active" @selected(old('status', $employee?->status ?? 'active') === 'active')>Active</option>
                            <option value="inactive" @selected(old('status', $employee?->status ?? '') === 'inactive')>Inactive</option>
                        </select>
                    </div>
                    @unless($isEdit)
                    <div class="mb-3">
                        <label class="form-label">Opening Leave Balance</label>
                        <input type="number" step="0.5" name="opening_leave" class="form-control" value="{{ old('opening_leave', 0) }}">
                    </div>
                    @endunless
                    <button type="submit" class="btn btn-awhr w-100">{{ $isEdit ? 'Update Employee' : 'Create Employee' }}</button>
                </div>
            </div>
        </div>
    </div>
</form>
