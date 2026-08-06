@extends('layouts.app')

@section('title', 'Reports')
@section('page_title', 'Reports')
@section('page_subtitle', 'Payroll and workforce analytics')

@section('content')
<div class="mb-4">
    <h1 class="page-title h4 mb-1">Reports Centre</h1>
    <p class="text-muted mb-0">Review, filter, and export payroll information.</p>
</div>

<div class="row g-3">
    @foreach([
        ['route' => 'reports.salary-register', 'icon' => 'bi-journal-text', 'title' => 'Salary Register', 'text' => 'Employee-wise monthly earnings, deductions, and net salary.'],
        ['route' => 'reports.monthly-payroll', 'icon' => 'bi-calendar-month', 'title' => 'Monthly Payroll', 'text' => 'Month-by-month payroll totals for a calendar year.'],
        ['route' => 'reports.yearly-payroll', 'icon' => 'bi-calendar3', 'title' => 'Yearly Payroll', 'text' => 'Financial-year payroll totals and period status.'],
        ['route' => 'reports.leave', 'icon' => 'bi-calendar2-heart', 'title' => 'Leave Report', 'text' => 'Opening, earned, taken, and current leave balances.'],
        ['route' => 'reports.professional-tax', 'icon' => 'bi-receipt-cutoff', 'title' => 'Professional Tax', 'text' => 'Monthly professional tax deductions by employee.'],
        ['route' => 'reports.salary-summary', 'icon' => 'bi-cash-coin', 'title' => 'Salary Summary', 'text' => 'Current employee salary structures and components.'],
        ['route' => 'reports.employee-ledger', 'icon' => 'bi-person-lines-fill', 'title' => 'Employee Ledger', 'text' => 'Complete payroll history for a selected employee.'],
    ] as $report)
        <div class="col-md-6 col-xl-4">
            <a href="{{ route($report['route']) }}" class="text-decoration-none">
                <div class="panel h-100">
                    <div class="panel-body d-flex gap-3">
                        <div class="stat-icon flex-shrink-0"><i class="bi {{ $report['icon'] }}"></i></div>
                        <div>
                            <h2 class="h6 text-body fw-bold mb-2">{{ $report['title'] }}</h2>
                            <p class="text-muted small mb-3">{{ $report['text'] }}</p>
                            <span class="text-primary small fw-semibold">Open report <i class="bi bi-arrow-right ms-1"></i></span>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    @endforeach
</div>
@endsection
