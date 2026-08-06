<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id', 'employee_code', 'name', 'photo', 'gender', 'dob', 'joining_date',
        'department', 'designation', 'mobile', 'email', 'address', 'pan_number',
        'aadhaar_number', 'bank_name', 'account_number', 'ifsc', 'uan', 'esic_number',
        'monthly_salary', 'status',
    ];

    protected function casts(): array
    {
        return [
            'dob' => 'date',
            'joining_date' => 'date',
            'monthly_salary' => 'decimal:2',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function salaryStructure(): HasOne
    {
        return $this->hasOne(SalaryStructure::class)->where('is_active', true)->latestOfMany();
    }

    public function salaryStructures(): HasMany
    {
        return $this->hasMany(SalaryStructure::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaveTransactions(): HasMany
    {
        return $this->hasMany(LeaveTransaction::class);
    }

    public function payrollDetails(): HasMany
    {
        return $this->hasMany(PayrollDetail::class);
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function isBirthdayToday(): bool
    {
        return $this->dob && $this->dob->isBirthday();
    }

    public function isAnniversaryToday(): bool
    {
        return $this->joining_date && $this->joining_date->isBirthday();
    }

    public function getPhotoUrlAttribute(): string
    {
        if ($this->photo && file_exists(public_path('uploads/employees/' . $this->photo))) {
            return asset('uploads/employees/' . $this->photo);
        }

        return 'https://ui-avatars.com/api/?name=' . urlencode($this->name) . '&background=1e5a96&color=fff';
    }
}
