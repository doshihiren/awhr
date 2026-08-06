<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeductionType extends Model
{
    protected $fillable = [
        'company_id', 'code', 'name', 'calculation_type', 'default_value',
        'is_enabled', 'is_statutory', 'description',
    ];

    protected function casts(): array
    {
        return [
            'default_value' => 'decimal:2',
            'is_enabled' => 'boolean',
            'is_statutory' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
