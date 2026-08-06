@extends('layouts.app')

@section('title', $employee->name)
@section('page_title', $employee->name)
@section('page_subtitle', $employee->employee_code)

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <a href="{{ route('employees.index') }}" class="text-decoration-none"><i class="bi bi-arrow-left"></i> Back</a>
    <div class="d-flex gap-2">
        <a href="{{ route('leaves.show', $employee) }}" class="btn btn-outline-primary btn-sm">Leaves</a>
        <a href="{{ route('employees.edit', $employee) }}" class="btn btn-awhr btn-sm"><i class="bi bi-pencil me-1"></i>Edit</a>
        <form method="POST" action="{{ route('employees.destroy', $employee) }}" onsubmit="return confirm('Delete this employee?')">
            @csrf @method('DELETE')
            <button class="btn btn-outline-danger btn-sm" type="submit">Delete</button>
        </form>
    </div>
</div>

<div class="row g-3">
    <div class="col-lg-4">
        <div class="panel text-center">
            <div class="panel-body">
                <img src="{{ $employee->photo_url }}" class="rounded-circle mb-3" width="100" height="100" alt="">
                <h5 class="mb-1">{{ $employee->name }}</h5>
                <div class="text-muted mb-2">{{ $employee->designation }} · {{ $employee->department }}</div>
                <span class="badge {{ $employee->status === 'active' ? 'text-bg-success' : 'text-bg-secondary' }}">{{ ucfirst($employee->status) }}</span>
                <hr>
                <div class="text-start small">
                    <div class="mb-2"><strong>Code:</strong> {{ $employee->employee_code }}</div>
                    <div class="mb-2"><strong>Mobile:</strong> {{ $employee->mobile ?: '—' }}</div>
                    <div class="mb-2"><strong>Email:</strong> {{ $employee->email ?: '—' }}</div>
                    <div class="mb-2"><strong>DOB:</strong> {{ $employee->dob?->format('d M Y') ?: '—' }}</div>
                    <div class="mb-2"><strong>Joined:</strong> {{ $employee->joining_date->format('d M Y') }}</div>
                    <div><strong>Address:</strong> {{ $employee->address ?: '—' }}</div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-lg-8">
        <div class="row g-3 mb-3">
            <div class="col-md-4">
                <div class="stat-card">
                    <div class="stat-label">Monthly Gross</div>
                    <div class="stat-value fs-4">₹{{ number_format($employee->monthly_salary, 2) }}</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="stat-card">
                    <div class="stat-label">Leave Balance ({{ $fy }})</div>
                    <div class="stat-value fs-4">{{ $leaveBalance?->current_balance ?? 0 }}</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="stat-card">
                    <div class="stat-label">Gender</div>
                    <div class="stat-value fs-5">{{ $employee->gender ? ucfirst($employee->gender) : '—' }}</div>
                </div>
            </div>
        </div>

        <div class="panel mb-3">
            <div class="panel-header">Salary Structure</div>
            <div class="panel-body">
                @if($employee->salaryStructure)
                    <div class="row text-center">
                        <div class="col-4">
                            <div class="text-muted small">Basic ({{ $employee->salaryStructure->basic_percent }}%)</div>
                            <strong>₹{{ number_format($employee->salaryStructure->basic_amount, 2) }}</strong>
                        </div>
                        <div class="col-4">
                            <div class="text-muted small">HRA ({{ $employee->salaryStructure->hra_percent }}%)</div>
                            <strong>₹{{ number_format($employee->salaryStructure->hra_amount, 2) }}</strong>
                        </div>
                        <div class="col-4">
                            <div class="text-muted small">Other ({{ $employee->salaryStructure->other_allowance_percent }}%)</div>
                            <strong>₹{{ number_format($employee->salaryStructure->other_allowance_amount, 2) }}</strong>
                        </div>
                    </div>
                @else
                    <p class="text-muted mb-0">No salary structure.</p>
                @endif
            </div>
        </div>

        <div class="panel mb-3">
            <div class="panel-header">Bank & Statutory</div>
            <div class="panel-body">
                <div class="row g-2 small">
                    <div class="col-md-6"><strong>PAN:</strong> {{ $employee->pan_number ?: '—' }}</div>
                    <div class="col-md-6"><strong>Aadhaar:</strong> {{ $employee->aadhaar_number ?: '—' }}</div>
                    <div class="col-md-6"><strong>UAN:</strong> {{ $employee->uan ?: '—' }}</div>
                    <div class="col-md-6"><strong>ESIC:</strong> {{ $employee->esic_number ?: '—' }}</div>
                    <div class="col-md-6"><strong>Bank:</strong> {{ $employee->bank_name ?: '—' }}</div>
                    <div class="col-md-6"><strong>A/C:</strong> {{ $employee->account_number ?: '—' }}</div>
                    <div class="col-md-6"><strong>IFSC:</strong> {{ $employee->ifsc ?: '—' }}</div>
                </div>
            </div>
        </div>

        <div class="panel">
            <div class="panel-header">Recent Attendance</div>
            <div class="panel-body p-0">
                <table class="table mb-0">
                    <thead><tr><th>Period</th><th>Working</th><th>Present</th><th>LOP</th></tr></thead>
                    <tbody>
                        @forelse($employee->attendances as $a)
                            <tr>
                                <td>{{ $a->period_label }}</td>
                                <td>{{ $a->working_days }}</td>
                                <td>{{ $a->present_days }}</td>
                                <td>{{ $a->lop_days }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="4" class="text-muted text-center">No attendance yet.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection
