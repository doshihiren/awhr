<?php

namespace App\Http\Controllers;

use App\Exports\BankTransferExport;
use App\Models\Payroll;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BankTransferController extends Controller
{
    public function index(Request $request): View
    {
        $companyId = Auth::user()->company_id;
        $payrolls = Payroll::where('company_id', $companyId)
            ->whereIn('status', ['calculated', 'frozen', 'approved', 'locked'])
            ->latest('year')
            ->latest('month')
            ->get();

        $payroll = null;
        if ($request->filled('payroll_id')) {
            $payroll = Payroll::with(['details.employee'])
                ->where('company_id', $companyId)
                ->findOrFail($request->payroll_id);
        }

        return view('bank-transfer.index', compact('payrolls', 'payroll'));
    }

    public function excel(Payroll $payroll): BinaryFileResponse
    {
        abort_unless($payroll->company_id === Auth::user()->company_id, 403);
        $payroll->load('details.employee');

        return Excel::download(
            new BankTransferExport($payroll),
            'bank_transfer_' . str_replace(' ', '_', $payroll->period_label) . '.xlsx'
        );
    }

    public function csv(Payroll $payroll): StreamedResponse
    {
        abort_unless($payroll->company_id === Auth::user()->company_id, 403);
        $payroll->load('details.employee');

        $filename = 'bank_transfer_' . str_replace(' ', '_', $payroll->period_label) . '.csv';

        return response()->streamDownload(function () use ($payroll) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Employee Name', 'Account Number', 'IFSC', 'Net Salary']);
            foreach ($payroll->details as $detail) {
                fputcsv($handle, [
                    $detail->employee->name,
                    $detail->employee->account_number,
                    $detail->employee->ifsc,
                    $detail->net_salary,
                ]);
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
