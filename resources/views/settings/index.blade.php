@extends('layouts.app')

@section('title', 'Settings')
@section('page_title', 'Settings')
@section('page_subtitle', 'Configure company and payroll rules')

@section('content')
<div class="mb-3">
    <h1 class="page-title h4 mb-0">Application Settings</h1>
</div>

<div class="panel">
    <div class="panel-header p-0">
        <ul class="nav nav-tabs border-0 px-3 pt-2" id="settingsTabs" role="tablist">
            <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#company" type="button"><i class="bi bi-building me-1"></i>Company</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#salary" type="button"><i class="bi bi-cash-stack me-1"></i>Salary</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#leave" type="button"><i class="bi bi-calendar2-heart me-1"></i>Leave</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tax" type="button"><i class="bi bi-receipt me-1"></i>Professional Tax</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#deductions" type="button"><i class="bi bi-dash-circle me-1"></i>Deductions</button></li>
        </ul>
    </div>
    <div class="panel-body">
        <div class="tab-content">
            <div class="tab-pane fade show active" id="company">
                <form method="POST" action="{{ route('settings.company') }}" enctype="multipart/form-data" class="row g-3">
                    @csrf
                    <div class="col-12"><h2 class="h6 text-primary">Company Profile</h2></div>
                    <div class="col-md-6">
                        <label for="name" class="form-label">Company Name <span class="text-danger">*</span></label>
                        <input id="name" type="text" name="name" value="{{ old('name', $company->name) }}" maxlength="255" class="form-control @error('name') is-invalid @enderror" required>
                        @error('name')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-3">
                        <label for="email" class="form-label">Email</label>
                        <input id="email" type="email" name="email" value="{{ old('email', $company->email) }}" class="form-control @error('email') is-invalid @enderror">
                        @error('email')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-3">
                        <label for="phone" class="form-label">Phone</label>
                        <input id="phone" type="text" name="phone" value="{{ old('phone', $company->phone) }}" maxlength="20" class="form-control @error('phone') is-invalid @enderror">
                        @error('phone')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-12">
                        <label for="address" class="form-label">Address</label>
                        <textarea id="address" name="address" rows="2" class="form-control @error('address') is-invalid @enderror">{{ old('address', $company->address) }}</textarea>
                        @error('address')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-3">
                        <label for="gstin" class="form-label">GSTIN</label>
                        <input id="gstin" type="text" name="gstin" value="{{ old('gstin', $company->gstin) }}" maxlength="20" class="form-control @error('gstin') is-invalid @enderror">
                        @error('gstin')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-3">
                        <label for="pan" class="form-label">Company PAN</label>
                        <input id="pan" type="text" name="pan" value="{{ old('pan', $company->pan) }}" maxlength="20" class="form-control @error('pan') is-invalid @enderror">
                        @error('pan')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-3">
                        <label for="office_start_time" class="form-label">Office Start Time</label>
                        <input id="office_start_time" type="time" name="office_start_time" value="{{ old('office_start_time', substr((string)($company->office_start_time ?? '09:30:00'), 0, 5)) }}" class="form-control">
                        <small class="text-muted">Used for late mark on check-in</small>
                    </div>
                    <div class="col-md-3">
                        <label for="late_grace_minutes" class="form-label">Late Grace (minutes)</label>
                        <input id="late_grace_minutes" type="number" min="0" name="late_grace_minutes" value="{{ old('late_grace_minutes', $company->late_grace_minutes ?? 0) }}" class="form-control">
                    </div>
                    <div class="col-md-3">
                        <label for="logo" class="form-label">Company Logo</label>
                        <input id="logo" type="file" name="logo" accept="image/*" class="form-control @error('logo') is-invalid @enderror">
                        @error('logo')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        @if($company->logo)<small class="text-muted">Current: {{ $company->logo }}</small>@endif
                    </div>
                    <div class="col-md-3">
                        <label for="signature" class="form-label">Authorized Signature</label>
                        <input id="signature" type="file" name="signature" accept="image/*" class="form-control @error('signature') is-invalid @enderror">
                        @error('signature')<div class="invalid-feedback">{{ $message }}</div>@enderror
                        @if($company->signature)<small class="text-muted">Current: {{ $company->signature }}</small>@endif
                    </div>
                    <div class="col-12">
                        <hr>
                        <h2 class="h6 text-primary">Payslip Header</h2>
                    </div>
                    <div class="col-md-9">
                        <label for="payslip_header" class="form-label">Header Text</label>
                        <input id="payslip_header" type="text" name="payslip_header" value="{{ old('payslip_header', $payslipHeader) }}" maxlength="255" class="form-control @error('payslip_header') is-invalid @enderror" placeholder="Salary Payslip">
                        @error('payslip_header')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-12 text-end">
                        <button type="submit" class="btn btn-awhr"><i class="bi bi-check-lg me-1"></i>Save Company Settings</button>
                    </div>
                </form>
            </div>

            <div class="tab-pane fade" id="salary">
                <form method="POST" action="{{ route('settings.salary-components') }}" class="row g-3">
                    @csrf
                    <div class="col-12">
                        <h2 class="h6 text-primary">Salary Components</h2>
                        <p class="text-muted small">Percentages are applied to monthly gross salary and must total 100%.</p>
                    </div>
                    @foreach(['basic_percent' => 'Basic Salary', 'hra_percent' => 'House Rent Allowance', 'other_allowance_percent' => 'Other Allowance'] as $field => $label)
                        <div class="col-md-4">
                            <label for="{{ $field }}" class="form-label">{{ $label }}</label>
                            <div class="input-group">
                                <input id="{{ $field }}" type="number" step="0.01" min="0" max="100" name="{{ $field }}" value="{{ old($field, $salaryComponents[$field]) }}" class="form-control @error($field) is-invalid @enderror" required>
                                <span class="input-group-text">%</span>
                            </div>
                            @error($field)<div class="text-danger small mt-1">{{ $message }}</div>@enderror
                        </div>
                    @endforeach
                    <div class="col-12 text-end"><button type="submit" class="btn btn-awhr"><i class="bi bi-check-lg me-1"></i>Save Salary Components</button></div>
                </form>
            </div>

            <div class="tab-pane fade" id="leave">
                <form method="POST" action="{{ route('settings.leave-rules') }}" class="row g-3">
                    @csrf
                    <div class="col-12"><h2 class="h6 text-primary">Leave Rules</h2><p class="text-muted small">Configure the default paid leave entitlement and accrual policy.</p></div>
                    <div class="col-md-4">
                        <label for="annual_paid_leaves" class="form-label">Annual Paid Leaves</label>
                        <input id="annual_paid_leaves" type="number" step="0.5" min="0" name="annual_paid_leaves" value="{{ old('annual_paid_leaves', $leaveRules['annual_paid_leaves']) }}" class="form-control @error('annual_paid_leaves') is-invalid @enderror" required>
                        @error('annual_paid_leaves')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-4">
                        <label for="monthly_accrual" class="form-label">Monthly Accrual</label>
                        <input id="monthly_accrual" type="number" step="0.5" min="0" name="monthly_accrual" value="{{ old('monthly_accrual', $leaveRules['monthly_accrual']) }}" class="form-control @error('monthly_accrual') is-invalid @enderror" required>
                        @error('monthly_accrual')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-4">
                        <label for="minimum_balance" class="form-label">Minimum Balance</label>
                        <input id="minimum_balance" type="number" step="0.5" name="minimum_balance" value="{{ old('minimum_balance', $leaveRules['minimum_balance']) }}" class="form-control @error('minimum_balance') is-invalid @enderror" required>
                        @error('minimum_balance')<div class="invalid-feedback">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-12 text-end"><button type="submit" class="btn btn-awhr"><i class="bi bi-check-lg me-1"></i>Save Leave Rules</button></div>
                </form>
            </div>

            <div class="tab-pane fade" id="tax">
                <form method="POST" action="{{ route('settings.professional-tax') }}" class="row g-3">
                    @csrf
                    <div class="col-12"><h2 class="h6 text-primary">Professional Tax Rule</h2><p class="text-muted small">Deduct a fixed amount when earned salary meets or exceeds the threshold.</p></div>
                    <div class="col-md-4">
                        <label for="threshold" class="form-label">Salary Threshold</label>
                        <div class="input-group"><span class="input-group-text">₹</span><input id="threshold" type="number" step="0.01" min="0" name="threshold" value="{{ old('threshold', $ptRule?->threshold ?? 12000) }}" class="form-control @error('threshold') is-invalid @enderror" required></div>
                        @error('threshold')<div class="text-danger small mt-1">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-4">
                        <label for="amount" class="form-label">Deduction Amount</label>
                        <div class="input-group"><span class="input-group-text">₹</span><input id="amount" type="number" step="0.01" min="0" name="amount" value="{{ old('amount', $ptRule?->amount ?? 200) }}" class="form-control @error('amount') is-invalid @enderror" required></div>
                        @error('amount')<div class="text-danger small mt-1">{{ $message }}</div>@enderror
                    </div>
                    <div class="col-md-4 d-flex align-items-end">
                        <div class="form-check form-switch mb-2">
                            <input type="hidden" name="is_enabled" value="0">
                            <input id="is_enabled" type="checkbox" name="is_enabled" value="1" class="form-check-input" @checked(old('is_enabled', $ptRule?->is_enabled ?? true))>
                            <label for="is_enabled" class="form-check-label">Enable professional tax</label>
                        </div>
                    </div>
                    <div class="col-12 text-end"><button type="submit" class="btn btn-awhr"><i class="bi bi-check-lg me-1"></i>Save Tax Rule</button></div>
                </form>
            </div>

            <div class="tab-pane fade" id="deductions">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div><h2 class="h6 text-primary mb-1">Deduction Modules</h2><p class="text-muted small mb-0">These modules are prepared for future payroll releases.</p></div>
                    <span class="badge text-bg-light">Configuration coming soon</span>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-light"><tr><th>Code</th><th>Deduction</th><th>Calculation</th><th>Default Value</th><th>Type</th><th>Status</th></tr></thead>
                        <tbody>
                            @forelse($deductions as $deduction)
                                <tr>
                                    <td><code>{{ strtoupper($deduction->code) }}</code></td>
                                    <td><div class="fw-semibold">{{ $deduction->name }}</div><small class="text-muted">{{ $deduction->description }}</small></td>
                                    <td>{{ ucfirst($deduction->calculation_type) }}</td>
                                    <td>{{ $deduction->default_value !== null ? number_format($deduction->default_value, 2) : '—' }}</td>
                                    <td><span class="badge {{ $deduction->is_statutory ? 'text-bg-info' : 'text-bg-light' }}">{{ $deduction->is_statutory ? 'Statutory' : 'Optional' }}</span></td>
                                    <td><span class="badge {{ $deduction->is_enabled ? 'text-bg-success' : 'text-bg-secondary' }}">{{ $deduction->is_enabled ? 'Enabled' : 'Disabled / Future' }}</span></td>
                                </tr>
                            @empty
                                <tr><td colspan="6" class="text-center text-muted py-4">No deduction modules are configured.</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
document.querySelectorAll('#settingsTabs button[data-bs-toggle="tab"]').forEach(function (tab) {
    tab.addEventListener('shown.bs.tab', function (event) {
        history.replaceState(null, '', event.target.dataset.bsTarget);
    });
});
const hashTab = document.querySelector('#settingsTabs button[data-bs-target="' + window.location.hash + '"]');
if (hashTab) bootstrap.Tab.getOrCreateInstance(hashTab).show();
</script>
@endpush
