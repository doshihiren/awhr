<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Company;
use App\Models\Employee;
use App\Models\SalaryStructure;
use App\Models\Setting;

class SalaryCalculationService
{
    public function __construct(
        protected ProfessionalTaxService $professionalTaxService
    ) {}

    /**
     * Get configurable salary component percentages.
     */
    public function getComponentPercents(?int $companyId = null): array
    {
        return [
            'basic_percent' => (float) Setting::getValue(
                $companyId,
                'salary_components',
                'basic_percent',
                config('awhr.salary_components.basic_percent')
            ),
            'hra_percent' => (float) Setting::getValue(
                $companyId,
                'salary_components',
                'hra_percent',
                config('awhr.salary_components.hra_percent')
            ),
            'other_allowance_percent' => (float) Setting::getValue(
                $companyId,
                'salary_components',
                'other_allowance_percent',
                config('awhr.salary_components.other_allowance_percent')
            ),
        ];
    }

    /**
     * Sync or create salary structure for an employee from monthly salary.
     */
    public function syncSalaryStructure(Employee $employee): SalaryStructure
    {
        $percents = $this->getComponentPercents($employee->company_id);
        $data = SalaryStructure::buildFromGross((float) $employee->monthly_salary, $percents);
        $data['employee_id'] = $employee->id;
        $data['effective_from'] = now()->toDateString();
        $data['is_active'] = true;

        // Deactivate old structures
        $employee->salaryStructures()->where('is_active', true)->update(['is_active' => false]);

        return SalaryStructure::create($data);
    }

    /**
     * Prorate salary based on attendance.
     * Formula: Monthly Salary × (Present Days / Total Working Days)
     */
    public function calculateEarnedSalary(float $monthlySalary, int $presentDays, int $workingDays): float
    {
        if ($workingDays <= 0) {
            return 0;
        }

        return round($monthlySalary * ($presentDays / $workingDays), 2);
    }

    /**
     * Full salary breakdown for an employee for a given attendance period.
     */
    public function calculateForEmployee(Employee $employee, Attendance $attendance, ?Company $company = null): array
    {
        $company = $company ?? $employee->company;
        $structure = $employee->salaryStructure;
        $monthlyGross = $structure
            ? (float) $structure->monthly_gross
            : (float) $employee->monthly_salary;

        $percents = $structure ? [
            'basic_percent' => (float) $structure->basic_percent,
            'hra_percent' => (float) $structure->hra_percent,
            'other_allowance_percent' => (float) $structure->other_allowance_percent,
        ] : $this->getComponentPercents($employee->company_id);

        $earnedGross = $this->calculateEarnedSalary(
            $monthlyGross,
            (int) $attendance->present_days,
            (int) $attendance->working_days
        );

        $ratio = $monthlyGross > 0 ? ($earnedGross / $monthlyGross) : 0;

        $basic = round($monthlyGross * ($percents['basic_percent'] / 100) * $ratio, 2);
        $hra = round($monthlyGross * ($percents['hra_percent'] / 100) * $ratio, 2);
        $other = round($earnedGross - $basic - $hra, 2);

        // Future-ready deductions (disabled by default → 0)
        $pf = 0;
        $esic = 0;
        $tds = 0;
        $loan = 0;
        $advance = 0;
        $otherDeduction = 0;

        $professionalTax = $this->professionalTaxService->calculate($earnedGross, $company);
        $totalDeductions = $professionalTax + $pf + $esic + $tds + $loan + $advance + $otherDeduction;
        $netSalary = round($earnedGross - $totalDeductions, 2);

        return [
            'monthly_gross' => $monthlyGross,
            'basic' => $basic,
            'hra' => $hra,
            'other_allowance' => $other,
            'earned_gross' => $earnedGross,
            'professional_tax' => $professionalTax,
            'pf' => $pf,
            'esic' => $esic,
            'tds' => $tds,
            'loan' => $loan,
            'advance' => $advance,
            'other_deduction' => $otherDeduction,
            'total_deductions' => $totalDeductions,
            'net_salary' => max(0, $netSalary),
            'working_days' => (int) $attendance->working_days,
            'present_days' => (int) $attendance->present_days,
            'lop_days' => (int) $attendance->lop_days,
        ];
    }
}
