<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveTransaction extends Model
{
    protected $fillable = [
        'employee_id', 'leave_balance_id', 'financial_year', 'type',
        'days', 'transaction_date', 'remarks', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'days' => 'decimal:2',
            'transaction_date' => 'date',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveBalance(): BelongsTo
    {
        return $this->belongsTo(LeaveBalance::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
