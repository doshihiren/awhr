<?php

namespace App\Helpers;

use Carbon\Carbon;

class FinancialYearHelper
{
    /**
     * Get financial year string for a given date (e.g. "2025-2026").
     * Indian FY: 1 April – 31 March.
     */
    public static function forDate(?Carbon $date = null): string
    {
        $date = $date ?? now();
        $startMonth = (int) config('awhr.financial_year.start_month', 4);

        if ($date->month >= $startMonth) {
            return $date->year . '-' . ($date->year + 1);
        }

        return ($date->year - 1) . '-' . $date->year;
    }

    /**
     * Get start and end Carbon dates for a financial year string.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public static function range(string $financialYear): array
    {
        [$startYear] = explode('-', $financialYear);
        $startYear = (int) $startYear;
        $startMonth = (int) config('awhr.financial_year.start_month', 4);
        $startDay = (int) config('awhr.financial_year.start_day', 1);
        $endMonth = (int) config('awhr.financial_year.end_month', 3);
        $endDay = (int) config('awhr.financial_year.end_day', 31);

        $start = Carbon::create($startYear, $startMonth, $startDay)->startOfDay();
        $end = Carbon::create($startYear + 1, $endMonth, $endDay)->endOfDay();

        return [$start, $end];
    }

    /**
     * List of recent financial years for dropdowns.
     */
    public static function options(int $back = 3, int $forward = 1): array
    {
        $current = self::forDate();
        [$startYear] = explode('-', $current);
        $startYear = (int) $startYear;
        $options = [];

        for ($y = $startYear - $back; $y <= $startYear + $forward; $y++) {
            $fy = $y . '-' . ($y + 1);
            $options[$fy] = $fy;
        }

        return $options;
    }
}
