<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceDay;
use App\Models\Company;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceDayService
{
    public function officeStart(Company $company): Carbon
    {
        $time = $company->office_start_time ?? '09:30:00';

        return Carbon::createFromFormat('H:i:s', strlen($time) === 5 ? $time . ':00' : $time);
    }

    public function calculateLateMinutes(Company $company, string $checkInTime): int
    {
        $start = $this->officeStart($company);
        $grace = (int) ($company->late_grace_minutes ?? 0);
        $checkIn = Carbon::createFromFormat('H:i', substr($checkInTime, 0, 5));
        $threshold = $start->copy()->addMinutes($grace);

        if ($checkIn->lte($threshold)) {
            return 0;
        }

        return (int) $threshold->diffInMinutes($checkIn);
    }

    public function checkIn(Employee $employee): AttendanceDay
    {
        $today = now()->toDateString();
        $existing = AttendanceDay::where('employee_id', $employee->id)->whereDate('date', $today)->first();

        if ($existing && $existing->check_in) {
            throw ValidationException::withMessages(['check_in' => 'You have already checked in today.']);
        }

        $company = $employee->company;
        $checkIn = now()->format('H:i:s');
        $lateMinutes = $this->calculateLateMinutes($company, $checkIn);

        return AttendanceDay::updateOrCreate(
            ['employee_id' => $employee->id, 'date' => $today],
            [
                'check_in' => $checkIn,
                'status' => 'present',
                'late_minutes' => $lateMinutes,
                'is_late' => $lateMinutes > 0,
                'source' => 'checkin',
                'created_by' => Auth::id(),
                'remarks' => $lateMinutes > 0 ? "Late by {$lateMinutes} minutes" : null,
            ]
        );
    }

    public function checkOut(Employee $employee): AttendanceDay
    {
        $today = now()->toDateString();
        $day = AttendanceDay::where('employee_id', $employee->id)->whereDate('date', $today)->first();

        if (!$day || !$day->check_in) {
            throw ValidationException::withMessages(['check_out' => 'Please check in first.']);
        }

        if ($day->check_out) {
            throw ValidationException::withMessages(['check_out' => 'You have already checked out today.']);
        }

        $day->update([
            'check_out' => now()->format('H:i:s'),
        ]);

        $this->syncMonthlySummary($employee, (int) now()->month, (int) now()->year);

        return $day->fresh();
    }

    /**
     * Rebuild monthly attendance summary from daily logs.
     */
    public function syncMonthlySummary(Employee $employee, int $month, int $year): Attendance
    {
        $days = AttendanceDay::where('employee_id', $employee->id)
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->get();

        $present = $days->whereIn('status', ['present', 'half_day'])->count();
        // half day counts as 0.5 for payroll present days
        $presentDays = (int) round(
            $days->sum(fn (AttendanceDay $d) => match ($d->status) {
                'present' => 1,
                'half_day' => 0.5,
                default => 0,
            })
        );
        $lateDays = $days->where('is_late', true)->count();
        $leaveDays = $days->where('status', 'leave')->count();
        $absent = $days->where('status', 'absent')->count();

        // Working days = present + absent + leave + half (exclude holiday/week_off)
        $workingDays = max(
            $days->whereNotIn('status', ['holiday', 'week_off'])->count(),
            $presentDays + $absent
        );

        if ($workingDays === 0) {
            // fallback calendar weekdays in month
            $workingDays = $this->countWeekdays($month, $year);
        }

        $lopDays = max(0, $workingDays - $presentDays);

        return Attendance::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'month' => $month,
                'year' => $year,
            ],
            [
                'working_days' => $workingDays,
                'present_days' => $presentDays,
                'lop_days' => $lopDays,
                'late_days' => $lateDays,
                'overtime_days' => 0,
                'remarks' => "Synced from daily attendance ({$leaveDays} leave days)",
                'created_by' => Auth::id(),
            ]
        );
    }

    public function countWeekdays(int $month, int $year): int
    {
        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $count = 0;

        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            if (!$d->isWeekend()) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Import daily rows: employee_code, date, status, check_in, check_out, remarks
     */
    public function importDailyRows(Company $company, array $rows): array
    {
        $imported = 0;
        $errors = [];

        DB::transaction(function () use ($company, $rows, &$imported, &$errors) {
            $touched = [];

            foreach ($rows as $index => $row) {
                $line = $index + 2; // header is line 1
                $code = trim((string) ($row['employee_code'] ?? ''));
                $date = trim((string) ($row['date'] ?? ''));

                if ($code === '' || $date === '') {
                    $errors[] = "Line {$line}: employee_code and date are required.";
                    continue;
                }

                $employee = Employee::where('company_id', $company->id)
                    ->where('employee_code', $code)
                    ->first();

                if (!$employee) {
                    $errors[] = "Line {$line}: Employee code {$code} not found.";
                    continue;
                }

                try {
                    $parsedDate = Carbon::parse($date)->toDateString();
                } catch (\Throwable $e) {
                    $errors[] = "Line {$line}: Invalid date {$date}.";
                    continue;
                }

                $status = strtolower(trim((string) ($row['status'] ?? 'present')));
                $allowed = ['present', 'absent', 'half_day', 'leave', 'holiday', 'week_off'];
                if (!in_array($status, $allowed, true)) {
                    $status = 'present';
                }

                $checkIn = $this->normalizeTime($row['check_in'] ?? null);
                $checkOut = $this->normalizeTime($row['check_out'] ?? null);
                $lateMinutes = 0;
                if ($checkIn && $status === 'present') {
                    $lateMinutes = $this->calculateLateMinutes($company, $checkIn);
                }

                AttendanceDay::updateOrCreate(
                    ['employee_id' => $employee->id, 'date' => $parsedDate],
                    [
                        'check_in' => $checkIn,
                        'check_out' => $checkOut,
                        'status' => $status,
                        'late_minutes' => $lateMinutes,
                        'is_late' => $lateMinutes > 0,
                        'remarks' => $row['remarks'] ?? null,
                        'source' => 'import',
                        'created_by' => Auth::id(),
                    ]
                );

                $touched[$employee->id . '-' . Carbon::parse($parsedDate)->format('Y-n')] = [
                    'employee' => $employee,
                    'month' => (int) Carbon::parse($parsedDate)->month,
                    'year' => (int) Carbon::parse($parsedDate)->year,
                ];
                $imported++;
            }

            foreach ($touched as $item) {
                $this->syncMonthlySummary($item['employee'], $item['month'], $item['year']);
            }
        });

        return compact('imported', 'errors');
    }

    /**
     * Import monthly summary rows.
     */
    public function importMonthlyRows(Company $company, array $rows): array
    {
        $imported = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $line = $index + 2;
            $code = trim((string) ($row['employee_code'] ?? ''));
            $month = (int) ($row['month'] ?? 0);
            $year = (int) ($row['year'] ?? 0);

            if ($code === '' || $month < 1 || $month > 12 || $year < 2000) {
                $errors[] = "Line {$line}: employee_code, month, year are required.";
                continue;
            }

            $employee = Employee::where('company_id', $company->id)->where('employee_code', $code)->first();
            if (!$employee) {
                $errors[] = "Line {$line}: Employee code {$code} not found.";
                continue;
            }

            $working = (int) ($row['working_days'] ?? 0);
            $present = (int) ($row['present_days'] ?? 0);
            $lop = (int) ($row['lop_days'] ?? max(0, $working - $present));
            $late = (int) ($row['late_days'] ?? 0);

            Attendance::updateOrCreate(
                ['employee_id' => $employee->id, 'month' => $month, 'year' => $year],
                [
                    'working_days' => $working,
                    'present_days' => $present,
                    'lop_days' => $lop,
                    'late_days' => $late,
                    'overtime_days' => (int) ($row['overtime_days'] ?? 0),
                    'remarks' => $row['remarks'] ?? 'Imported monthly attendance',
                    'created_by' => Auth::id(),
                ]
            );
            $imported++;
        }

        return compact('imported', 'errors');
    }

    protected function normalizeTime(mixed $value): ?string
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        $value = trim((string) $value);

        try {
            if (is_numeric($value)) {
                // Excel time fraction
                $seconds = (int) round(((float) $value) * 86400);
                return gmdate('H:i:s', $seconds);
            }

            return Carbon::parse($value)->format('H:i:s');
        } catch (\Throwable $e) {
            return null;
        }
    }
}
