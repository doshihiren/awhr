<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollDetail extends Model
{
    protected $fillable = [
        'payroll_id', 'employee_id', 'attendance_id',
        'working_days', 'present_days', 'lop_days',
        'monthly_gross', 'basic', 'hra', 'other_allowance', 'earned_gross',
        'professional_tax', 'pf', 'esic', 'tds', 'loan', 'advance', 'other_deduction',
        'total_deductions', 'net_salary', 'leave_balance',
        'is_paid', 'paid_on', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'monthly_gross' => 'decimal:2',
            'basic' => 'decimal:2',
            'hra' => 'decimal:2',
            'other_allowance' => 'decimal:2',
            'earned_gross' => 'decimal:2',
            'professional_tax' => 'decimal:2',
            'pf' => 'decimal:2',
            'esic' => 'decimal:2',
            'tds' => 'decimal:2',
            'loan' => 'decimal:2',
            'advance' => 'decimal:2',
            'other_deduction' => 'decimal:2',
            'total_deductions' => 'decimal:2',
            'net_salary' => 'decimal:2',
            'leave_balance' => 'decimal:2',
            'is_paid' => 'boolean',
            'paid_on' => 'date',
        ];
    }

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }
}
