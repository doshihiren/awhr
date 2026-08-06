<?php

namespace App\Services;

use App\Helpers\FinancialYearHelper;
use App\Models\Attendance;
use App\Models\Company;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollDetail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayrollService
{
    public function __construct(
        protected SalaryCalculationService $salaryCalculationService,
        protected LeaveService $leaveService,
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Create or get payroll for a month/year.
     */
    public function getOrCreate(Company $company, int $month, int $year): Payroll
    {
        return Payroll::firstOrCreate(
            [
                'company_id' => $company->id,
                'month' => $month,
                'year' => $year,
            ],
            [
                'financial_year' => FinancialYearHelper::forDate(
                    \Carbon\Carbon::create($year, $month, 1)
                ),
                'status' => 'draft',
                'created_by' => Auth::id(),
            ]
        );
    }

    /**
     * Calculate payroll for all active employees with attendance.
     */
    public function calculate(Payroll $payroll): Payroll
    {
        if ($payroll->isLocked() && $payroll->status !== 'draft' && $payroll->status !== 'calculated') {
            throw ValidationException::withMessages([
                'payroll' => 'Cannot recalculate a frozen/approved/locked payroll.',
            ]);
        }

        return DB::transaction(function () use ($payroll) {
            $company = $payroll->company;
            $employees = Employee::where('company_id', $company->id)->active()->get();

            // Clear previous details if recalculating
            $payroll->details()->delete();

            $totalGross = 0;
            $totalDeductions = 0;
            $totalNet = 0;
            $count = 0;

            foreach ($employees as $employee) {
                $attendance = Attendance::where('employee_id', $employee->id)
                    ->where('month', $payroll->month)
                    ->where('year', $payroll->year)
                    ->first();

                if (!$attendance) {
                    continue;
                }

                $calc = $this->salaryCalculationService->calculateForEmployee($employee, $attendance, $company);
                $leaveBalance = $this->leaveService->ensureBalance($employee, $payroll->financial_year);

                PayrollDetail::create([
                    'payroll_id' => $payroll->id,
                    'employee_id' => $employee->id,
                    'attendance_id' => $attendance->id,
                    'working_days' => $calc['working_days'],
                    'present_days' => $calc['present_days'],
                    'lop_days' => $calc['lop_days'],
                    'monthly_gross' => $calc['monthly_gross'],
                    'basic' => $calc['basic'],
                    'hra' => $calc['hra'],
                    'other_allowance' => $calc['other_allowance'],
                    'earned_gross' => $calc['earned_gross'],
                    'professional_tax' => $calc['professional_tax'],
                    'pf' => $calc['pf'],
                    'esic' => $calc['esic'],
                    'tds' => $calc['tds'],
                    'loan' => $calc['loan'],
                    'advance' => $calc['advance'],
                    'other_deduction' => $calc['other_deduction'],
                    'total_deductions' => $calc['total_deductions'],
                    'net_salary' => $calc['net_salary'],
                    'leave_balance' => $leaveBalance->current_balance,
                ]);

                $totalGross += $calc['earned_gross'];
                $totalDeductions += $calc['total_deductions'];
                $totalNet += $calc['net_salary'];
                $count++;
            }

            $payroll->update([
                'status' => 'calculated',
                'total_employees' => $count,
                'total_gross' => round($totalGross, 2),
                'total_deductions' => round($totalDeductions, 2),
                'total_net' => round($totalNet, 2),
                'calculated_at' => now(),
            ]);

            $this->auditLogService->log(
                'payroll_generated',
                "Payroll calculated for {$payroll->period_label}",
                $payroll
            );

            return $payroll->fresh(['details.employee']);
        });
    }

    /**
     * Update a single payroll detail before freeze.
     */
    public function updateDetail(PayrollDetail $detail, array $data): PayrollDetail
    {
        $payroll = $detail->payroll;

        if (!$payroll->isEditable()) {
            throw ValidationException::withMessages([
                'payroll' => 'Payroll is locked. Edit is not allowed.',
            ]);
        }

        $old = $detail->toArray();

        $detail->fill($data);

        // Recalc totals if components changed
        $detail->total_deductions = round(
            (float) $detail->professional_tax
            + (float) $detail->pf
            + (float) $detail->esic
            + (float) $detail->tds
            + (float) $detail->loan
            + (float) $detail->advance
            + (float) $detail->other_deduction,
            2
        );
        $detail->net_salary = round((float) $detail->earned_gross - (float) $detail->total_deductions, 2);
        $detail->save();

        $this->recalculateTotals($payroll);

        $this->auditLogService->log(
            'salary_edited',
            "Salary edited for employee #{$detail->employee_id} in {$payroll->period_label}",
            $detail,
            $old,
            $detail->fresh()->toArray()
        );

        return $detail->fresh();
    }

    public function freeze(Payroll $payroll): Payroll
    {
        if (!$payroll->canFreeze()) {
            throw ValidationException::withMessages(['payroll' => 'Payroll must be calculated before freezing.']);
        }

        $payroll->update(['status' => 'frozen', 'frozen_at' => now()]);
        $this->auditLogService->log('payroll_frozen', "Payroll frozen for {$payroll->period_label}", $payroll);

        return $payroll->fresh();
    }

    public function approve(Payroll $payroll): Payroll
    {
        if (!$payroll->canApprove()) {
            throw ValidationException::withMessages(['payroll' => 'Payroll must be frozen before approval.']);
        }

        $payroll->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => Auth::id(),
        ]);

        // Mark details as paid
        $payroll->details()->update(['is_paid' => true, 'paid_on' => now()->toDateString()]);

        $this->auditLogService->log('payroll_approved', "Payroll approved for {$payroll->period_label}", $payroll);

        return $payroll->fresh();
    }

    public function lock(Payroll $payroll): Payroll
    {
        if (!$payroll->canLock()) {
            throw ValidationException::withMessages(['payroll' => 'Payroll must be approved before locking.']);
        }

        $payroll->update(['status' => 'locked', 'locked_at' => now()]);
        $this->auditLogService->log('payroll_locked', "Payroll locked for {$payroll->period_label}", $payroll);

        return $payroll->fresh();
    }

    protected function recalculateTotals(Payroll $payroll): void
    {
        $aggregates = $payroll->details()
            ->selectRaw('COUNT(*) as cnt, COALESCE(SUM(earned_gross),0) as gross, COALESCE(SUM(total_deductions),0) as deductions, COALESCE(SUM(net_salary),0) as net')
            ->first();

        $payroll->update([
            'total_employees' => $aggregates->cnt,
            'total_gross' => $aggregates->gross,
            'total_deductions' => $aggregates->deductions,
            'total_net' => $aggregates->net,
        ]);
    }
}
