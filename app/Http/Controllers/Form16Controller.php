<?php

namespace App\Http\Controllers;

use App\Exports\Form16Export;
use App\Helpers\FinancialYearHelper;
use App\Models\Employee;
use App\Models\PayrollDetail;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class Form16Controller extends Controller
{
    public function index(Request $request): View
    {
        $companyId = Auth::user()->company_id;
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $employees = Employee::where('company_id', $companyId)->active()->orderBy('name')->get();
        $fyOptions = FinancialYearHelper::options();

        return view('form16.index', compact('employees', 'fy', 'fyOptions'));
    }

    public function show(Request $request, Employee $employee): View
    {
        $this->authorizeEmployee($employee);
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $data = $this->buildForm16Data($employee, $fy);
        $company = Auth::user()->company;

        return view('form16.show', compact('employee', 'fy', 'data', 'company'));
    }

    public function pdf(Request $request, Employee $employee): Response
    {
        $this->authorizeEmployee($employee);
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $data = $this->buildForm16Data($employee, $fy);
        $company = Auth::user()->company;

        abort_unless($company, 500, 'Company profile is missing. Please update Settings.');

        $pdf = Pdf::loadView('form16.pdf', compact('employee', 'fy', 'data', 'company'))
            ->setPaper('a4');

        return $pdf->download("form16_{$employee->employee_code}_{$fy}.pdf");
    }

    public function excel(Request $request, Employee $employee): BinaryFileResponse
    {
        $this->authorizeEmployee($employee);
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $data = $this->buildForm16Data($employee, $fy);

        return Excel::download(
            new Form16Export($employee, $fy, $data),
            "form16_{$employee->employee_code}_{$fy}.xlsx"
        );
    }

    protected function authorizeEmployee(Employee $employee): void
    {
        $user = Auth::user();

        if ($user->role === 'employee') {
            abort_unless($user->employee_id === $employee->id, 403);
            return;
        }

        abort_unless($employee->company_id === $user->company_id, 403);
    }

    protected function buildForm16Data(Employee $employee, string $fy): array
    {
        [$start, $end] = FinancialYearHelper::range($fy);

        // Include calculated/frozen/approved/locked — exclude only draft empty payrolls
        $details = PayrollDetail::with('payroll')
            ->where('employee_id', $employee->id)
            ->whereHas('payroll', function ($q) use ($fy) {
                $q->where('financial_year', $fy)
                    ->whereIn('status', ['calculated', 'frozen', 'approved', 'locked']);
            })
            ->get()
            ->sortBy(fn ($d) => sprintf('%04d-%02d', $d->payroll->year, $d->payroll->month))
            ->values();

        $salaryPaid = (float) $details->sum('earned_gross');
        $professionalTax = (float) $details->sum('professional_tax');
        $otherDeductions = (float) $details->sum(
            fn ($d) => (float) $d->pf + (float) $d->esic + (float) $d->loan + (float) $d->advance + (float) $d->other_deduction
        );
        $tds = (float) $details->sum('tds');
        $netPaid = (float) $details->sum('net_salary');
        $taxableIncome = max(0, $salaryPaid - $professionalTax - $otherDeductions - $tds);

        return [
            'period_start' => $start,
            'period_end' => $end,
            'salary_paid' => $salaryPaid,
            'professional_tax' => $professionalTax,
            'other_deductions' => $otherDeductions,
            'tds' => $tds,
            'net_paid' => $netPaid,
            'taxable_income' => $taxableIncome,
            'monthly_details' => $details,
            'has_data' => $details->isNotEmpty(),
        ];
    }
}
