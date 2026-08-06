@extends('layouts.app')

@section('title', 'Form 16')
@section('page_title', 'Form 16')
@section('page_subtitle', 'Employee annual tax statement')

@section('content')
<div class="mb-3">
    <h1 class="page-title h4 mb-0">Generate Form 16</h1>
</div>

<div class="row justify-content-center">
    <div class="col-lg-7">
        <div class="panel">
            <div class="panel-header"><span><i class="bi bi-file-earmark-text me-2"></i>Statement Selection</span></div>
            <div class="panel-body">
                <p class="text-muted">Select an employee and financial year. Form 16 uses calculated / frozen / approved / locked payrolls.</p>
                <form method="GET" action="{{ url('/form16/preview') }}" id="form16Selection" class="row g-3">
                    <div class="col-md-7">
                        <label for="employee_id" class="form-label">Employee <span class="text-danger">*</span></label>
                        <select id="employee_id" name="employee_id" class="form-select" required>
                            <option value="">Select employee</option>
                            @foreach($employees as $employee)
                                <option value="{{ $employee->id }}">{{ $employee->employee_code }} — {{ $employee->name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="col-md-5">
                        <label for="financial_year" class="form-label">Financial Year <span class="text-danger">*</span></label>
                        <select id="financial_year" name="financial_year" class="form-select" required>
                            @foreach($fyOptions as $key => $option)
                                <option value="{{ $option }}" @selected($fy === $option)>{{ $option }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="col-12 text-end">
                        <button type="submit" class="btn btn-awhr"><i class="bi bi-eye me-1"></i>View Form 16</button>
                    </div>
                </form>
            </div>
        </div>

        <div class="panel mt-3">
            <div class="panel-header">Quick links</div>
            <div class="panel-body">
                <div class="list-group list-group-flush">
                    @foreach($employees->take(8) as $employee)
                        <a class="list-group-item list-group-item-action d-flex justify-content-between"
                           href="{{ route('form16.show', ['employee' => $employee, 'financial_year' => $fy]) }}">
                            <span>{{ $employee->name }}</span>
                            <span class="text-muted">{{ $employee->employee_code }}</span>
                        </a>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
document.getElementById('form16Selection').addEventListener('submit', function (event) {
    event.preventDefault();
    const employeeId = document.getElementById('employee_id').value;
    const fy = document.getElementById('financial_year').value;
    if (!employeeId) return;
    window.location.href = @json(url('/form16')) + '/' + encodeURIComponent(employeeId) + '?financial_year=' + encodeURIComponent(fy);
});
</script>
@endpush
