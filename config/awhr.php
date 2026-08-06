<?php

return [

    /*
    |--------------------------------------------------------------------------
    | AWHR Payroll Configuration
    |--------------------------------------------------------------------------
    | Default values used when settings table has no override.
    | Everything here is overridable via Settings module.
    */

    'company' => [
        'name' => env('AWHR_COMPANY_NAME', 'AWHR Company'),
        'address' => env('AWHR_COMPANY_ADDRESS', ''),
        'logo' => null,
        'signature' => null,
        'payslip_header' => 'Salary Slip',
    ],

    'financial_year' => [
        'start_month' => 4,  // April
        'start_day' => 1,
        'end_month' => 3,    // March
        'end_day' => 31,
    ],

    'salary_components' => [
        'basic_percent' => 50,
        'hra_percent' => 40,
        'other_allowance_percent' => 10,
    ],

    'leave' => [
        'annual_paid_leaves' => 18,
        'monthly_accrual' => 1.5,
        'minimum_balance' => 0, // configurable floor; admin can set negative limit
        'allow_negative' => false,
    ],

    'professional_tax' => [
        'enabled' => true,
        'threshold' => 12000,
        'amount' => 200,
    ],

    'deductions' => [
        'pf' => ['enabled' => false, 'employee_percent' => 12, 'employer_percent' => 12],
        'esic' => ['enabled' => false, 'employee_percent' => 0.75, 'employer_percent' => 3.25],
        'tds' => ['enabled' => false],
        'loan' => ['enabled' => false],
        'advance' => ['enabled' => false],
        'other' => ['enabled' => false],
    ],

    'payroll' => [
        'statuses' => ['draft', 'calculated', 'frozen', 'approved', 'locked'],
    ],

    'theme' => [
        'primary' => '#1e5a96',
        'primary_dark' => '#0d3d6b',
        'primary_light' => '#e8f1fa',
        'accent' => '#2d7dd2',
    ],

];
