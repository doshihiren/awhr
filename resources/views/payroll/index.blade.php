@extends('layouts.app')

@section('title', 'Payroll')
@section('page_title', 'Payroll Processing')
@section('page_subtitle', 'Calculate, approve, and lock monthly payroll')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Payroll Runs</h1>
    <a href="{{ route('payroll.create') }}" class="btn btn-awhr"><i class="bi bi-plus-lg me-1"></i>New Payroll</a>
</div>

<div class="panel">
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Period</th>
                        <th>Financial Year</th>
                        <th class="text-center">Employees</th>
                        <th class="text-end">Gross</th>
                        <th class="text-end">Deductions</th>
                        <th class="text-end">Net Payroll</th>
                        <th>Status</th>
                        <th class="text-end">Action</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($payrolls as $payroll)
                        <tr>
                            <td class="fw-semibold">{{ $payroll->period_label }}</td>
                            <td>{{ $payroll->financial_year }}</td>
                            <td class="text-center">{{ $payroll->total_employees }}</td>
                            <td class="text-end">₹{{ number_format($payroll->total_gross, 2) }}</td>
                            <td class="text-end">₹{{ number_format($payroll->total_deductions, 2) }}</td>
                            <td class="text-end fw-semibold">₹{{ number_format($payroll->total_net, 2) }}</td>
                            <td>
                                <span class="badge badge-status-{{ $payroll->status }}">{{ ucfirst($payroll->status) }}</span>
                            </td>
                            <td class="text-end">
                                <a href="{{ route('payroll.show', $payroll) }}" class="btn btn-sm btn-outline-primary">
                                    View <i class="bi bi-arrow-right ms-1"></i>
                                </a>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="8" class="text-center text-muted py-5">No payroll runs yet. Create your first payroll period.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($payrolls->hasPages())
            <div class="p-3 border-top">{{ $payrolls->links() }}</div>
        @endif
    </div>
</div>
@endsection
