<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceDay extends Model
{
    protected $fillable = [
        'employee_id', 'date', 'check_in', 'check_out', 'status',
        'late_minutes', 'is_late', 'remarks', 'source', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'is_late' => 'boolean',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getWorkedHoursAttribute(): ?float
    {
        if (!$this->check_in || !$this->check_out) {
            return null;
        }

        $in = strtotime($this->date->format('Y-m-d') . ' ' . $this->check_in);
        $out = strtotime($this->date->format('Y-m-d') . ' ' . $this->check_out);

        if ($out <= $in) {
            return null;
        }

        return round(($out - $in) / 3600, 2);
    }
}
