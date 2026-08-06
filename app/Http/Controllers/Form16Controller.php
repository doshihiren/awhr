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
        abort_unless($employee->company_id === Auth::user()->company_id, 403);
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $data = $this->buildForm16Data($employee, $fy);

        return view('form16.show', compact('employee', 'fy', 'data'));
    }

    public function pdf(Request $request, Employee $employee): Response
    {
        abort_unless($employee->company_id === Auth::user()->company_id, 403);
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $data = $this->buildForm16Data($employee, $fy);
        $company = Auth::user()->company;

        $pdf = Pdf::loadView('form16.pdf', compact('employee', 'fy', 'data', 'company'))->setPaper('a4');

        return $pdf->download("form16_{$employee->employee_code}_{$fy}.pdf");
    }

    public function excel(Request $request, Employee $employee): BinaryFileResponse
    {
        abort_unless($employee->company_id === Auth::user()->company_id, 403);
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $data = $this->buildForm16Data($employee, $fy);

        return Excel::download(
            new Form16Export($employee, $fy, $data),
            "form16_{$employee->employee_code}_{$fy}.xlsx"
        );
    }

    protected function buildForm16Data(Employee $employee, string $fy): array
    {
        [$start, $end] = FinancialYearHelper::range($fy);

        $details = PayrollDetail::with('payroll')
            ->where('employee_id', $employee->id)
            ->whereHas('payroll', function ($q) use ($fy) {
                $q->where('financial_year', $fy)
                    ->whereIn('status', ['approved', 'locked', 'frozen']);
            })
            ->get();

        $salaryPaid = $details->sum('earned_gross');
        $professionalTax = $details->sum('professional_tax');
        $otherDeductions = $details->sum(fn ($d) => (float) $d->pf + (float) $d->esic + (float) $d->loan + (float) $d->advance + (float) $d->other_deduction);
        $tds = $details->sum('tds'); // future ready
        $taxableIncome = max(0, $salaryPaid - $professionalTax - $otherDeductions - $tds);

        return [
            'period_start' => $start,
            'period_end' => $end,
            'salary_paid' => (float) $salaryPaid,
            'professional_tax' => (float) $professionalTax,
            'other_deductions' => (float) $otherDeductions,
            'tds' => (float) $tds,
            'taxable_income' => (float) $taxableIncome,
            'monthly_details' => $details,
        ];
    }
}
