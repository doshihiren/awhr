<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryStructure extends Model
{
    protected $fillable = [
        'employee_id', 'monthly_gross', 'basic_percent', 'hra_percent', 'other_allowance_percent',
        'basic_amount', 'hra_amount', 'other_allowance_amount', 'effective_from', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'monthly_gross' => 'decimal:2',
            'basic_percent' => 'decimal:2',
            'hra_percent' => 'decimal:2',
            'other_allowance_percent' => 'decimal:2',
            'basic_amount' => 'decimal:2',
            'hra_amount' => 'decimal:2',
            'other_allowance_amount' => 'decimal:2',
            'effective_from' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Recalculate component amounts from gross and percentages.
     */
    public function recalculateAmounts(): void
    {
        $this->basic_amount = round($this->monthly_gross * ($this->basic_percent / 100), 2);
        $this->hra_amount = round($this->monthly_gross * ($this->hra_percent / 100), 2);
        $this->other_allowance_amount = round($this->monthly_gross * ($this->other_allowance_percent / 100), 2);
    }

    public static function buildFromGross(float $gross, ?array $percents = null): array
    {
        $percents = $percents ?? [
            'basic_percent' => (float) config('awhr.salary_components.basic_percent'),
            'hra_percent' => (float) config('awhr.salary_components.hra_percent'),
            'other_allowance_percent' => (float) config('awhr.salary_components.other_allowance_percent'),
        ];

        return [
            'monthly_gross' => $gross,
            'basic_percent' => $percents['basic_percent'],
            'hra_percent' => $percents['hra_percent'],
            'other_allowance_percent' => $percents['other_allowance_percent'],
            'basic_amount' => round($gross * ($percents['basic_percent'] / 100), 2),
            'hra_amount' => round($gross * ($percents['hra_percent'] / 100), 2),
            'other_allowance_amount' => round($gross * ($percents['other_allowance_percent'] / 100), 2),
        ];
    }
}
