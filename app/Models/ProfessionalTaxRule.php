<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfessionalTaxRule extends Model
{
    protected $fillable = [
        'company_id', 'name', 'threshold', 'amount', 'is_enabled', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'threshold' => 'decimal:2',
            'amount' => 'decimal:2',
            'is_enabled' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Calculate professional tax for a given salary amount.
     */
    public function calculate(float $salary): float
    {
        if (!$this->is_enabled) {
            return 0;
        }

        return $salary >= (float) $this->threshold ? (float) $this->amount : 0;
    }
}
