<?php

namespace App\Http\Controllers;

use App\Models\Payroll;
use App\Models\PayrollDetail;
use App\Services\PayrollService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class PayrollController extends Controller
{
    public function __construct(
        protected PayrollService $payrollService
    ) {}

    public function index(): View
    {
        $payrolls = Payroll::where('company_id', Auth::user()->company_id)
            ->latest('year')
            ->latest('month')
            ->paginate(12);

        return view('payroll.index', compact('payrolls'));
    }

    public function create(): View
    {
        return view('payroll.create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
        ]);

        $payroll = $this->payrollService->getOrCreate(
            Auth::user()->company,
            (int) $validated['month'],
            (int) $validated['year']
        );

        return redirect()->route('payroll.show', $payroll)
            ->with('success', "Payroll period {$payroll->period_label} ready.");
    }

    public function show(Payroll $payroll): View
    {
        abort_unless($payroll->company_id === Auth::user()->company_id, 403);
        $payroll->load(['details.employee']);

        return view('payroll.show', compact('payroll'));
    }

    public function calculate(Payroll $payroll): RedirectResponse
    {
        abort_unless($payroll->company_id === Auth::user()->company_id, 403);
        $this->payrollService->calculate($payroll);

        return redirect()->route('payroll.show', $payroll)
            ->with('success', 'Payroll calculated successfully.');
    }

    public function freeze(Payroll $payroll): RedirectResponse
    {
        abort_unless($payroll->company_id === Auth::user()->company_id, 403);
        $this->payrollService->freeze($payroll);

        return back()->with('success', 'Payroll frozen.');
    }

    public function approve(Payroll $payroll): RedirectResponse
    {
        abort_unless($payroll->company_id === Auth::user()->company_id, 403);
        $this->payrollService->approve($payroll);

        return back()->with('success', 'Payroll approved. Salaries marked as paid.');
    }

    public function lock(Payroll $payroll): RedirectResponse
    {
        abort_unless($payroll->company_id === Auth::user()->company_id, 403);
        $this->payrollService->lock($payroll);

        return back()->with('success', 'Payroll locked.');
    }

    public function editDetail(PayrollDetail $detail): View
    {
        abort_unless($detail->payroll->company_id === Auth::user()->company_id, 403);
        abort_unless($detail->payroll->isEditable(), 403, 'Payroll is not editable.');

        return view('payroll.edit-detail', compact('detail'));
    }

    public function updateDetail(Request $request, PayrollDetail $detail): RedirectResponse
    {
        abort_unless($detail->payroll->company_id === Auth::user()->company_id, 403);

        $validated = $request->validate([
            'basic' => ['required', 'numeric', 'min:0'],
            'hra' => ['required', 'numeric', 'min:0'],
            'other_allowance' => ['required', 'numeric', 'min:0'],
            'earned_gross' => ['required', 'numeric', 'min:0'],
            'professional_tax' => ['required', 'numeric', 'min:0'],
            'pf' => ['nullable', 'numeric', 'min:0'],
            'esic' => ['nullable', 'numeric', 'min:0'],
            'tds' => ['nullable', 'numeric', 'min:0'],
            'loan' => ['nullable', 'numeric', 'min:0'],
            'advance' => ['nullable', 'numeric', 'min:0'],
            'other_deduction' => ['nullable', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $this->payrollService->updateDetail($detail, $validated);

        return redirect()->route('payroll.show', $detail->payroll_id)
            ->with('success', 'Salary detail updated.');
    }
}
