<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Payroll;
use App\Models\PayrollDetail;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class PayslipController extends Controller
{
    public function index(Payroll $payroll): View
    {
        abort_unless($payroll->company_id === Auth::user()->company_id, 403);
        $payroll->load(['details.employee']);

        return view('payslips.index', compact('payroll'));
    }

    public function show(PayrollDetail $detail): View
    {
        abort_unless($detail->payroll->company_id === Auth::user()->company_id, 403);
        $detail->load(['employee', 'payroll.company']);
        $company = $detail->payroll->company;

        return view('payslips.show', compact('detail', 'company'));
    }

    public function download(PayrollDetail $detail): Response
    {
        abort_unless($detail->payroll->company_id === Auth::user()->company_id, 403);
        $detail->load(['employee', 'payroll.company']);
        $company = $detail->payroll->company;

        $pdf = Pdf::loadView('payslips.pdf', compact('detail', 'company'))
            ->setPaper('a4');

        $filename = sprintf(
            'payslip_%s_%s.pdf',
            $detail->employee->employee_code,
            $detail->payroll->period_label
        );

        return $pdf->download(str_replace(' ', '_', $filename));
    }

    public function downloadAll(Payroll $payroll): Response
    {
        abort_unless($payroll->company_id === Auth::user()->company_id, 403);
        $payroll->load(['details.employee', 'company']);
        $company = $payroll->company;

        $pdf = Pdf::loadView('payslips.pdf-all', [
            'payroll' => $payroll,
            'company' => $company,
            'details' => $payroll->details,
        ])->setPaper('a4');

        return $pdf->download('payslips_' . str_replace(' ', '_', $payroll->period_label) . '.pdf');
    }
}
