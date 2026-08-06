<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Services\EmployeeAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class EmployeeAccountController extends Controller
{
    public function __construct(
        protected EmployeeAccountService $employeeAccountService
    ) {}

    public function index(): View
    {
        $employees = Employee::with('user')
            ->where('company_id', Auth::user()->company_id)
            ->orderBy('name')
            ->paginate(20);

        return view('employees.accounts', compact('employees'));
    }

    public function createForEmployee(Employee $employee): RedirectResponse
    {
        abort_unless($employee->company_id === Auth::user()->company_id, 403);

        $result = $this->employeeAccountService->ensureLogin($employee, null, true);

        return back()->with(
            'success',
            "Login ready for {$employee->name}. Email: {$employee->email} | Password: {$result['password']}"
        );
    }

    public function createAll(Request $request): RedirectResponse
    {
        $reset = $request->boolean('reset_password');
        $count = $this->employeeAccountService->ensureLoginsForCompany(Auth::user()->company_id, $reset);

        return back()->with(
            'success',
            "Created/updated login for {$count} employee(s). Default password format: Emp@{employee_code}"
        );
    }
}
