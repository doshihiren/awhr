@extends('layouts.app')

@section('title', 'Employee Logins')
@section('page_title', 'Employee Logins')
@section('page_subtitle', 'Create portal access for employees')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <div>
        <h1 class="page-title h4 mb-1">Employee Portal Accounts</h1>
        <p class="text-muted mb-0 small">Default password format: <code>Emp@{employee_code}</code> (example: Emp@EMP001)</p>
    </div>
    <form method="POST" action="{{ route('employee-accounts.create-all') }}" onsubmit="return confirm('Create/update logins for all active employees with email?')">
        @csrf
        <button class="btn btn-awhr"><i class="bi bi-people me-1"></i>Create All Logins</button>
    </form>
</div>

<div class="panel">
    <div class="panel-body p-0">
        <table class="table table-hover mb-0 align-middle">
            <thead class="table-light">
                <tr><th>Code</th><th>Name</th><th>Email</th><th>Login Status</th><th></th></tr>
            </thead>
            <tbody>
                @foreach($employees as $employee)
                    <tr>
                        <td>{{ $employee->employee_code }}</td>
                        <td>{{ $employee->name }}</td>
                        <td>{{ $employee->email ?: '—' }}</td>
                        <td>
                            @if($employee->user)
                                <span class="badge text-bg-success">Active</span>
                                <small class="text-muted">{{ $employee->user->email }}</small>
                            @else
                                <span class="badge text-bg-secondary">No login</span>
                            @endif
                        </td>
                        <td class="text-end">
                            @if($employee->email)
                                <form method="POST" action="{{ route('employee-accounts.create', $employee) }}" class="d-inline">
                                    @csrf
                                    <button class="btn btn-sm btn-outline-primary">
                                        {{ $employee->user ? 'Reset Password' : 'Create Login' }}
                                    </button>
                                </form>
                            @else
                                <span class="text-muted small">Add email first</span>
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
        <div class="p-3">{{ $employees->links() }}</div>
    </div>
</div>
@endsection
