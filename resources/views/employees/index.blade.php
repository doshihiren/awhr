@extends('layouts.app')

@section('title', 'Employees')
@section('page_title', 'Employee Master')
@section('page_subtitle', 'Manage employee records')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Employees</h1>
    <a href="{{ route('employees.create') }}" class="btn btn-awhr"><i class="bi bi-person-plus me-1"></i>Add Employee</a>
</div>

<div class="panel mb-3">
    <div class="panel-body">
        <form method="GET" class="row g-2 align-items-end">
            <div class="col-md-4">
                <label class="form-label">Search</label>
                <input type="text" name="search" value="{{ request('search') }}" class="form-control" placeholder="Name, code, email, mobile...">
            </div>
            <div class="col-md-3">
                <label class="form-label">Department</label>
                <select name="department" class="form-select">
                    <option value="">All</option>
                    @foreach($departments as $dept)
                        <option value="{{ $dept }}" @selected(request('department') === $dept)>{{ $dept }}</option>
                    @endforeach
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">Status</label>
                <select name="status" class="form-select">
                    <option value="">All</option>
                    <option value="active" @selected(request('status') === 'active')>Active</option>
                    <option value="inactive" @selected(request('status') === 'inactive')>Inactive</option>
                </select>
            </div>
            <div class="col-md-3">
                <button class="btn btn-awhr" type="submit">Filter</button>
                <a href="{{ route('employees.index') }}" class="btn btn-outline-secondary">Reset</a>
            </div>
        </form>
    </div>
</div>

<div class="panel">
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0 datatable">
                <thead class="table-light">
                    <tr>
                        <th>Code</th>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Designation</th>
                        <th>Mobile</th>
                        <th>Salary</th>
                        <th>Status</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($employees as $employee)
                        <tr>
                            <td>{{ $employee->employee_code }}</td>
                            <td>
                                <img src="{{ $employee->photo_url }}" width="32" height="32" class="rounded-circle me-2" alt="">
                                {{ $employee->name }}
                            </td>
                            <td>{{ $employee->department }}</td>
                            <td>{{ $employee->designation }}</td>
                            <td>{{ $employee->mobile }}</td>
                            <td>₹{{ number_format($employee->monthly_salary, 2) }}</td>
                            <td>
                                <span class="badge {{ $employee->status === 'active' ? 'text-bg-success' : 'text-bg-secondary' }}">
                                    {{ ucfirst($employee->status) }}
                                </span>
                            </td>
                            <td class="text-end">
                                <a href="{{ route('employees.show', $employee) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-eye"></i></a>
                                <a href="{{ route('employees.edit', $employee) }}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></a>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
        <div class="p-3">{{ $employees->links() }}</div>
    </div>
</div>
@endsection
