<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'address', 'logo', 'signature', 'email', 'phone', 'gstin', 'pan',
        'office_start_time', 'late_grace_minutes', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'late_grace_minutes' => 'integer',
        ];
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function payrolls(): HasMany
    {
        return $this->hasMany(Payroll::class);
    }

    public function settings(): HasMany
    {
        return $this->hasMany(Setting::class);
    }

    public function professionalTaxRules(): HasMany
    {
        return $this->hasMany(ProfessionalTaxRule::class);
    }

    public function activeProfessionalTaxRule(): HasOne
    {
        return $this->hasOne(ProfessionalTaxRule::class)->where('is_active', true)->latestOfMany();
    }
}
