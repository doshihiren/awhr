<?php

namespace App\Services;

use App\Helpers\FinancialYearHelper;
use App\Models\AppNotification;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\Payroll;
use App\Models\PayrollDetail;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function getStats(int $companyId): array
    {
        $now = now();
        $month = $now->month;
        $year = $now->year;
        $fy = FinancialYearHelper::forDate($now);

        $totalEmployees = Employee::where('company_id', $companyId)->active()->count();

        $currentPayroll = Payroll::where('company_id', $companyId)
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        $salaryPaid = PayrollDetail::whereHas('payroll', function ($q) use ($companyId, $month, $year) {
            $q->where('company_id', $companyId)->where('month', $month)->where('year', $year);
        })->where('is_paid', true)->sum('net_salary');

        $pendingSalary = PayrollDetail::whereHas('payroll', function ($q) use ($companyId, $month, $year) {
            $q->where('company_id', $companyId)->where('month', $month)->where('year', $year);
        })->where('is_paid', false)->sum('net_salary');

        // Employees currently with leave taken this month (approximation via leave transactions)
        $employeesOnLeave = DB::table('leave_transactions')
            ->join('employees', 'employees.id', '=', 'leave_transactions.employee_id')
            ->where('employees.company_id', $companyId)
            ->where('leave_transactions.type', 'taken')
            ->whereMonth('leave_transactions.transaction_date', $month)
            ->whereYear('leave_transactions.transaction_date', $year)
            ->distinct('leave_transactions.employee_id')
            ->count('leave_transactions.employee_id');

        $today = $now->copy()->startOfDay();
        $upcomingBirthdays = Employee::where('company_id', $companyId)
            ->active()
            ->whereNotNull('dob')
            ->get()
            ->filter(function (Employee $e) use ($today) {
                $next = $e->dob->copy()->year($today->year)->startOfDay();
                if ($next->lt($today)) {
                    $next->addYear();
                }
                return $today->diffInDays($next) <= 30;
            })
            ->sortBy(fn (Employee $e) => $e->dob->format('m-d'))
            ->take(10)
            ->values();

        $leaveLiability = LeaveBalance::whereHas('employee', fn ($q) => $q->where('company_id', $companyId)->active())
            ->where('financial_year', $fy)
            ->get()
            ->sum(function (LeaveBalance $lb) {
                $daily = ((float) $lb->employee->monthly_salary) / 30;
                return (float) $lb->current_balance * $daily;
            });

        $monthlySalaryCost = Employee::where('company_id', $companyId)->active()->sum('monthly_salary');

        // Chart: last 6 months payroll net
        $chartLabels = [];
        $chartData = [];
        for ($i = 5; $i >= 0; $i--) {
            $d = $now->copy()->subMonths($i);
            $chartLabels[] = $d->format('M Y');
            $p = Payroll::where('company_id', $companyId)
                ->where('month', $d->month)
                ->where('year', $d->year)
                ->first();
            $chartData[] = $p ? (float) $p->total_net : 0;
        }

        return [
            'total_employees' => $totalEmployees,
            'current_month_payroll' => $currentPayroll,
            'salary_paid' => (float) $salaryPaid,
            'pending_salary' => (float) ($currentPayroll && $currentPayroll->status === 'draft'
                ? $monthlySalaryCost
                : $pendingSalary),
            'employees_on_leave' => $employeesOnLeave,
            'upcoming_birthdays' => $upcomingBirthdays,
            'current_leave_liability' => round($leaveLiability, 2),
            'monthly_salary_cost' => (float) $monthlySalaryCost,
            'chart_labels' => $chartLabels,
            'chart_data' => $chartData,
        ];
    }

    /**
     * Generate system notifications (birthdays, anniversaries, pending payroll, negative leave).
     */
    public function syncNotifications(int $companyId, ?int $userId = null): void
    {
        $today = now();

        // Upcoming birthdays (today)
        $birthdayEmployees = Employee::where('company_id', $companyId)
            ->active()
            ->whereNotNull('dob')
            ->whereMonth('dob', $today->month)
            ->whereDay('dob', $today->day)
            ->get();

        foreach ($birthdayEmployees as $emp) {
            $this->upsertNotification($companyId, $userId, 'birthday', "Birthday: {$emp->name}", "Today is {$emp->name}'s birthday.", route('employees.show', $emp));
        }

        // Work anniversary
        $anniversaryEmployees = Employee::where('company_id', $companyId)
            ->active()
            ->whereMonth('joining_date', $today->month)
            ->whereDay('joining_date', $today->day)
            ->get();

        foreach ($anniversaryEmployees as $emp) {
            $years = $emp->joining_date->diffInYears($today);
            if ($years > 0) {
                $this->upsertNotification($companyId, $userId, 'anniversary', "Anniversary: {$emp->name}", "{$emp->name} completes {$years} year(s) today.", route('employees.show', $emp));
            }
        }

        // Payroll pending for current month
        $payroll = Payroll::where('company_id', $companyId)
            ->where('month', $today->month)
            ->where('year', $today->year)
            ->first();

        if (!$payroll || in_array($payroll->status, ['draft', 'calculated'], true)) {
            $this->upsertNotification(
                $companyId,
                $userId,
                'payroll_pending',
                'Payroll Pending',
                'Current month payroll is not yet approved.',
                route('payroll.index')
            );
        }

        // Negative leave balances
        $fy = FinancialYearHelper::forDate();
        $negativeLeaves = LeaveBalance::whereHas('employee', fn ($q) => $q->where('company_id', $companyId))
            ->where('financial_year', $fy)
            ->where('current_balance', '<', 0)
            ->with('employee')
            ->get();

        foreach ($negativeLeaves as $lb) {
            $this->upsertNotification(
                $companyId,
                $userId,
                'leave_negative',
                "Negative Leave: {$lb->employee->name}",
                "Leave balance is {$lb->current_balance}.",
                route('leaves.show', $lb->employee_id)
            );
        }
    }

    protected function upsertNotification(int $companyId, ?int $userId, string $type, string $title, string $message, ?string $link): void
    {
        $exists = AppNotification::where('company_id', $companyId)
            ->where('type', $type)
            ->where('title', $title)
            ->whereDate('created_at', today())
            ->exists();

        if (!$exists) {
            AppNotification::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'link' => $link,
            ]);
        }
    }
}
