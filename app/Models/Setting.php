<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = [
        'company_id', 'group', 'key', 'value', 'type',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function getCastedValueAttribute(): mixed
    {
        return match ($this->type) {
            'number' => (float) $this->value,
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($this->value, true),
            default => $this->value,
        };
    }

    public static function getValue(?int $companyId, string $group, string $key, mixed $default = null): mixed
    {
        $cacheKey = "setting.{$companyId}.{$group}.{$key}";

        return Cache::remember($cacheKey, 300, function () use ($companyId, $group, $key, $default) {
            $setting = static::query()
                ->where('company_id', $companyId)
                ->where('group', $group)
                ->where('key', $key)
                ->first();

            return $setting ? $setting->casted_value : $default;
        });
    }

    public static function setValue(?int $companyId, string $group, string $key, mixed $value, string $type = 'string'): self
    {
        $storeValue = $type === 'json' ? json_encode($value) : (string) $value;

        $setting = static::updateOrCreate(
            ['company_id' => $companyId, 'group' => $group, 'key' => $key],
            ['value' => $storeValue, 'type' => $type]
        );

        Cache::forget("setting.{$companyId}.{$group}.{$key}");

        return $setting;
    }
}
