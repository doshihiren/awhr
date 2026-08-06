@extends('layouts.app')

@section('title', 'My Payslips')
@section('page_title', 'My Payslips')

@section('content')
<div class="mb-3"><h1 class="page-title h4 mb-0">Salary Slips</h1></div>
<div class="panel">
    <div class="panel-body p-0">
        <table class="table table-hover mb-0 align-middle">
            <thead class="table-light">
                <tr><th>Period</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
                @forelse($payslips as $slip)
                    <tr>
                        <td>{{ $slip->payroll->period_label }}</td>
                        <td>₹{{ number_format($slip->earned_gross, 2) }}</td>
                        <td>₹{{ number_format($slip->total_deductions, 2) }}</td>
                        <td class="fw-semibold">₹{{ number_format($slip->net_salary, 2) }}</td>
                        <td><span class="badge badge-status-{{ $slip->payroll->status }}">{{ ucfirst($slip->payroll->status) }}</span></td>
                        <td class="text-end">
                            <a href="{{ route('portal.payslips.download', $slip) }}" class="btn btn-sm btn-outline-danger"><i class="bi bi-download me-1"></i>PDF</a>
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="6" class="text-center text-muted py-4">No payslips yet.</td></tr>
                @endforelse
            </tbody>
        </table>
        <div class="p-3">{{ $payslips->links() }}</div>
    </div>
</div>
@endsection
