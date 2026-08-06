<?php

namespace App\Http\Controllers;

use App\Helpers\FinancialYearHelper;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveTransaction;
use App\Services\LeaveService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class LeaveController extends Controller
{
    public function __construct(
        protected LeaveService $leaveService
    ) {}

    public function index(Request $request): View
    {
        $companyId = Auth::user()->company_id;
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());

        $balances = LeaveBalance::with('employee')
            ->where('financial_year', $fy)
            ->whereHas('employee', fn ($q) => $q->where('company_id', $companyId))
            ->when($request->search, function ($q) use ($request) {
                $q->whereHas('employee', fn ($eq) => $eq->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('employee_code', 'like', '%' . $request->search . '%'));
            })
            ->paginate(20)
            ->withQueryString();

        $fyOptions = FinancialYearHelper::options();

        return view('leaves.index', compact('balances', 'fy', 'fyOptions'));
    }

    public function show(Employee $employee, Request $request): View
    {
        abort_unless($employee->company_id === Auth::user()->company_id, 403);
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $balance = $this->leaveService->ensureBalance($employee, $fy);
        $transactions = LeaveTransaction::where('employee_id', $employee->id)
            ->where('financial_year', $fy)
            ->latest('transaction_date')
            ->paginate(20);

        $fyOptions = FinancialYearHelper::options();

        return view('leaves.show', compact('employee', 'balance', 'transactions', 'fy', 'fyOptions'));
    }

    public function adjust(Request $request, Employee $employee): RedirectResponse
    {
        abort_unless($employee->company_id === Auth::user()->company_id, 403);

        $validated = $request->validate([
            'financial_year' => ['required', 'string'],
            'opening_leave' => ['required', 'numeric'],
            'leaves_earned' => ['required', 'numeric', 'min:0'],
            'leaves_taken' => ['required', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $this->leaveService->adjustBalance(
            $employee,
            (float) $validated['opening_leave'],
            (float) $validated['leaves_earned'],
            (float) $validated['leaves_taken'],
            $validated['remarks'] ?? '',
            $validated['financial_year']
        );

        return redirect()
            ->route('leaves.show', ['employee' => $employee, 'financial_year' => $validated['financial_year']])
            ->with('success', 'Leave balance updated.');
    }

    public function take(Request $request, Employee $employee): RedirectResponse
    {
        abort_unless($employee->company_id === Auth::user()->company_id, 403);

        $validated = $request->validate([
            'financial_year' => ['required', 'string'],
            'days' => ['required', 'numeric', 'min:0.5'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $this->leaveService->takeLeave(
            $employee,
            (float) $validated['days'],
            $validated['remarks'] ?? '',
            $validated['financial_year']
        );

        return redirect()
            ->route('leaves.show', ['employee' => $employee, 'financial_year' => $validated['financial_year']])
            ->with('success', 'Leave recorded successfully.');
    }

    public function accrueAll(Request $request): RedirectResponse
    {
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $employees = Employee::where('company_id', Auth::user()->company_id)->active()->get();

        foreach ($employees as $employee) {
            $this->leaveService->accrueMonthly($employee, $fy);
        }

        return back()->with('success', 'Monthly leave accrued for all active employees.');
    }
}
