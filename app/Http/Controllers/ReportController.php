<?php

namespace App\Http\Controllers;

use App\Exports\BankTransferExport;
use App\Exports\GenericArrayExport;
use App\Helpers\FinancialYearHelper;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\Payroll;
use App\Models\PayrollDetail;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(): View
    {
        return view('reports.index');
    }

    public function salaryRegister(Request $request): View|BinaryFileResponse|Response
    {
        $companyId = Auth::user()->company_id;
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $payroll = Payroll::with(['details.employee'])
            ->where('company_id', $companyId)
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        $rows = $payroll?->details ?? collect();

        if ($request->input('export') === 'excel') {
            $data = $rows->map(fn ($d) => [
                $d->employee->employee_code,
                $d->employee->name,
                $d->employee->department,
                $d->working_days,
                $d->present_days,
                $d->earned_gross,
                $d->professional_tax,
                $d->total_deductions,
                $d->net_salary,
            ])->toArray();

            return Excel::download(
                new GenericArrayExport(
                    ['Code', 'Name', 'Department', 'Working Days', 'Present', 'Gross', 'PT', 'Deductions', 'Net'],
                    $data,
                    'Salary Register'
                ),
                "salary_register_{$month}_{$year}.xlsx"
            );
        }

        if ($request->input('export') === 'pdf') {
            $company = Auth::user()->company;
            $pdf = Pdf::loadView('reports.pdf.salary-register', compact('rows', 'month', 'year', 'company'));

            return $pdf->download("salary_register_{$month}_{$year}.pdf");
        }

        return view('reports.salary-register', compact('rows', 'month', 'year', 'payroll'));
    }

    public function monthlyPayroll(Request $request): View
    {
        $companyId = Auth::user()->company_id;
        $year = (int) $request->input('year', now()->year);
        $payrolls = Payroll::where('company_id', $companyId)->where('year', $year)->orderBy('month')->get();

        return view('reports.monthly-payroll', compact('payrolls', 'year'));
    }

    public function yearlyPayroll(Request $request): View
    {
        $companyId = Auth::user()->company_id;
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $payrolls = Payroll::where('company_id', $companyId)->where('financial_year', $fy)->orderBy('year')->orderBy('month')->get();
        $fyOptions = FinancialYearHelper::options();

        return view('reports.yearly-payroll', compact('payrolls', 'fy', 'fyOptions'));
    }

    public function leaveReport(Request $request): View|BinaryFileResponse
    {
        $companyId = Auth::user()->company_id;
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $balances = LeaveBalance::with('employee')
            ->where('financial_year', $fy)
            ->whereHas('employee', fn ($q) => $q->where('company_id', $companyId))
            ->get();

        if ($request->input('export') === 'excel') {
            $data = $balances->map(fn ($b) => [
                $b->employee->employee_code,
                $b->employee->name,
                $b->opening_leave,
                $b->leaves_earned,
                $b->leaves_taken,
                $b->current_balance,
            ])->toArray();

            return Excel::download(
                new GenericArrayExport(['Code', 'Name', 'Opening', 'Earned', 'Taken', 'Balance'], $data, 'Leave Report'),
                "leave_report_{$fy}.xlsx"
            );
        }

        $fyOptions = FinancialYearHelper::options();

        return view('reports.leave-report', compact('balances', 'fy', 'fyOptions'));
    }

    public function professionalTaxReport(Request $request): View|BinaryFileResponse
    {
        $companyId = Auth::user()->company_id;
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $details = PayrollDetail::with('employee')
            ->whereHas('payroll', fn ($q) => $q->where('company_id', $companyId)->where('month', $month)->where('year', $year))
            ->where('professional_tax', '>', 0)
            ->get();

        if ($request->input('export') === 'excel') {
            $data = $details->map(fn ($d) => [
                $d->employee->employee_code,
                $d->employee->name,
                $d->earned_gross,
                $d->professional_tax,
            ])->toArray();

            return Excel::download(
                new GenericArrayExport(['Code', 'Name', 'Gross', 'Professional Tax'], $data, 'PT Report'),
                "pt_report_{$month}_{$year}.xlsx"
            );
        }

        return view('reports.professional-tax', compact('details', 'month', 'year'));
    }

    public function salarySummary(Request $request): View
    {
        $companyId = Auth::user()->company_id;
        $employees = Employee::where('company_id', $companyId)
            ->with('salaryStructure')
            ->orderBy('name')
            ->get();

        return view('reports.salary-summary', compact('employees'));
    }

    public function employeeLedger(Request $request, ?Employee $employee = null): View
    {
        $companyId = Auth::user()->company_id;
        $employees = Employee::where('company_id', $companyId)->active()->orderBy('name')->get();
        $selected = $employee && $employee->company_id === $companyId ? $employee : null;
        $details = collect();

        if ($selected) {
            $details = PayrollDetail::with('payroll')
                ->where('employee_id', $selected->id)
                ->latest()
                ->get();
        }

        return view('reports.employee-ledger', compact('employees', 'selected', 'details'));
    }
}
