<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payroll extends Model
{
    protected $fillable = [
        'company_id', 'month', 'year', 'financial_year', 'status',
        'total_employees', 'total_gross', 'total_deductions', 'total_net',
        'calculated_at', 'frozen_at', 'approved_at', 'locked_at',
        'created_by', 'approved_by', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'total_gross' => 'decimal:2',
            'total_deductions' => 'decimal:2',
            'total_net' => 'decimal:2',
            'calculated_at' => 'datetime',
            'frozen_at' => 'datetime',
            'approved_at' => 'datetime',
            'locked_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(PayrollDetail::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function getPeriodLabelAttribute(): string
    {
        return date('F Y', mktime(0, 0, 0, $this->month, 1, $this->year));
    }

    public function isEditable(): bool
    {
        return in_array($this->status, ['draft', 'calculated'], true);
    }

    public function isLocked(): bool
    {
        return in_array($this->status, ['frozen', 'approved', 'locked'], true);
    }

    public function canFreeze(): bool
    {
        return $this->status === 'calculated';
    }

    public function canApprove(): bool
    {
        return $this->status === 'frozen';
    }

    public function canLock(): bool
    {
        return $this->status === 'approved';
    }
}
