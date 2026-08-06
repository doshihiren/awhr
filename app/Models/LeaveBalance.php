<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveBalance extends Model
{
    protected $fillable = [
        'employee_id', 'financial_year', 'opening_leave', 'leaves_earned',
        'leaves_taken', 'current_balance',
    ];

    protected function casts(): array
    {
        return [
            'opening_leave' => 'decimal:2',
            'leaves_earned' => 'decimal:2',
            'leaves_taken' => 'decimal:2',
            'current_balance' => 'decimal:2',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LeaveTransaction::class);
    }

    /**
     * Recompute balance: opening + earned - taken.
     */
    public function recalculate(): void
    {
        $this->current_balance = round(
            (float) $this->opening_leave + (float) $this->leaves_earned - (float) $this->leaves_taken,
            2
        );
    }
}
