<?php

namespace App\Services;

use App\Helpers\FinancialYearHelper;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveTransaction;
use App\Models\Setting;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeaveService
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    public function getAnnualLeaves(?int $companyId = null): float
    {
        return (float) Setting::getValue(
            $companyId,
            'leave',
            'annual_paid_leaves',
            config('awhr.leave.annual_paid_leaves')
        );
    }

    public function getMonthlyAccrual(?int $companyId = null): float
    {
        return (float) Setting::getValue(
            $companyId,
            'leave',
            'monthly_accrual',
            config('awhr.leave.monthly_accrual')
        );
    }

    public function getMinimumBalance(?int $companyId = null): float
    {
        return (float) Setting::getValue(
            $companyId,
            'leave',
            'minimum_balance',
            config('awhr.leave.minimum_balance')
        );
    }

    /**
     * Ensure leave balance row exists for employee + FY.
     */
    public function ensureBalance(Employee $employee, ?string $financialYear = null): LeaveBalance
    {
        $financialYear = $financialYear ?? FinancialYearHelper::forDate();

        return LeaveBalance::firstOrCreate(
            [
                'employee_id' => $employee->id,
                'financial_year' => $financialYear,
            ],
            [
                'opening_leave' => 0,
                'leaves_earned' => 0,
                'leaves_taken' => 0,
                'current_balance' => 0,
            ]
        );
    }

    /**
     * Accrue monthly leave (1.5 by default) for an employee.
     */
    public function accrueMonthly(Employee $employee, ?string $financialYear = null): LeaveBalance
    {
        return DB::transaction(function () use ($employee, $financialYear) {
            $financialYear = $financialYear ?? FinancialYearHelper::forDate();
            $balance = $this->ensureBalance($employee, $financialYear);
            $days = $this->getMonthlyAccrual($employee->company_id);

            $balance->leaves_earned = round((float) $balance->leaves_earned + $days, 2);
            $balance->recalculate();
            $balance->save();

            LeaveTransaction::create([
                'employee_id' => $employee->id,
                'leave_balance_id' => $balance->id,
                'financial_year' => $financialYear,
                'type' => 'accrual',
                'days' => $days,
                'transaction_date' => now()->toDateString(),
                'remarks' => 'Monthly leave accrual',
                'created_by' => Auth::id(),
            ]);

            return $balance->fresh();
        });
    }

    /**
     * Record leave taken.
     */
    public function takeLeave(Employee $employee, float $days, string $remarks = '', ?string $financialYear = null): LeaveBalance
    {
        return DB::transaction(function () use ($employee, $days, $remarks, $financialYear) {
            $financialYear = $financialYear ?? FinancialYearHelper::forDate();
            $balance = $this->ensureBalance($employee, $financialYear);
            $minBalance = $this->getMinimumBalance($employee->company_id);
            $newBalance = (float) $balance->current_balance - $days;

            if ($newBalance < $minBalance) {
                throw ValidationException::withMessages([
                    'days' => "Leave balance cannot go below {$minBalance}. Current balance: {$balance->current_balance}",
                ]);
            }

            $balance->leaves_taken = round((float) $balance->leaves_taken + $days, 2);
            $balance->recalculate();
            $balance->save();

            LeaveTransaction::create([
                'employee_id' => $employee->id,
                'leave_balance_id' => $balance->id,
                'financial_year' => $financialYear,
                'type' => 'taken',
                'days' => $days,
                'transaction_date' => now()->toDateString(),
                'remarks' => $remarks ?: 'Leave taken',
                'created_by' => Auth::id(),
            ]);

            $this->auditLogService->log('leave_updated', "Leave taken: {$days} days for {$employee->name}", $balance);

            return $balance->fresh();
        });
    }

    /**
     * Admin manual edit of leave balance.
     */
    public function adjustBalance(
        Employee $employee,
        float $openingLeave,
        float $leavesEarned,
        float $leavesTaken,
        string $remarks = '',
        ?string $financialYear = null
    ): LeaveBalance {
        return DB::transaction(function () use ($employee, $openingLeave, $leavesEarned, $leavesTaken, $remarks, $financialYear) {
            $financialYear = $financialYear ?? FinancialYearHelper::forDate();
            $balance = $this->ensureBalance($employee, $financialYear);
            $old = $balance->only(['opening_leave', 'leaves_earned', 'leaves_taken', 'current_balance']);

            $balance->opening_leave = $openingLeave;
            $balance->leaves_earned = $leavesEarned;
            $balance->leaves_taken = $leavesTaken;
            $balance->recalculate();

            $minBalance = $this->getMinimumBalance($employee->company_id);
            if ((float) $balance->current_balance < $minBalance) {
                throw ValidationException::withMessages([
                    'current_balance' => "Leave balance cannot go below {$minBalance}.",
                ]);
            }

            $balance->save();

            $delta = (float) $balance->current_balance - (float) $old['current_balance'];

            LeaveTransaction::create([
                'employee_id' => $employee->id,
                'leave_balance_id' => $balance->id,
                'financial_year' => $financialYear,
                'type' => 'adjustment',
                'days' => $delta,
                'transaction_date' => now()->toDateString(),
                'remarks' => $remarks ?: 'Manual leave balance adjustment',
                'created_by' => Auth::id(),
            ]);

            $this->auditLogService->log(
                'leave_updated',
                "Leave balance adjusted for {$employee->name}",
                $balance,
                $old,
                $balance->only(['opening_leave', 'leaves_earned', 'leaves_taken', 'current_balance'])
            );

            return $balance->fresh();
        });
    }
}
