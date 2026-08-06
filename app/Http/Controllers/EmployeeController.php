<?php

namespace App\Http\Controllers;

use App\Helpers\FinancialYearHelper;
use App\Http\Requests\EmployeeStoreRequest;
use App\Http\Requests\EmployeeUpdateRequest;
use App\Models\Employee;
use App\Models\SalaryStructure;
use App\Repositories\EmployeeRepository;
use App\Services\AuditLogService;
use App\Services\EmployeeAccountService;
use App\Services\LeaveService;
use App\Services\SalaryCalculationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class EmployeeController extends Controller
{
    public function __construct(
        protected EmployeeRepository $employeeRepository,
        protected SalaryCalculationService $salaryCalculationService,
        protected LeaveService $leaveService,
        protected AuditLogService $auditLogService,
        protected EmployeeAccountService $employeeAccountService
    ) {}

    public function index(Request $request): View
    {
        $companyId = Auth::user()->company_id;
        $employees = $this->employeeRepository->paginate($companyId, $request->only(['search', 'status', 'department']));
        $departments = Employee::where('company_id', $companyId)->whereNotNull('department')->distinct()->pluck('department');

        return view('employees.index', compact('employees', 'departments'));
    }

    public function create(): View
    {
        $percents = $this->salaryCalculationService->getComponentPercents(Auth::user()->company_id);

        return view('employees.create', compact('percents'));
    }

    public function store(EmployeeStoreRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $companyId = Auth::user()->company_id;

        $employee = DB::transaction(function () use ($data, $request, $companyId) {
            if ($request->hasFile('photo')) {
                $filename = time() . '_' . $request->file('photo')->hashName();
                $request->file('photo')->move(public_path('uploads/employees'), $filename);
                $data['photo'] = $filename;
            }

            $data['company_id'] = $companyId;
            $data['pan_number'] = isset($data['pan_number']) ? strtoupper($data['pan_number']) : null;
            $data['ifsc'] = isset($data['ifsc']) ? strtoupper($data['ifsc']) : null;

            unset($data['basic_percent'], $data['hra_percent'], $data['other_allowance_percent'], $data['opening_leave']);

            $employee = Employee::create($data);

            $percents = [
                'basic_percent' => (float) ($request->input('basic_percent') ?? config('awhr.salary_components.basic_percent')),
                'hra_percent' => (float) ($request->input('hra_percent') ?? config('awhr.salary_components.hra_percent')),
                'other_allowance_percent' => (float) ($request->input('other_allowance_percent') ?? config('awhr.salary_components.other_allowance_percent')),
            ];

            $structureData = SalaryStructure::buildFromGross((float) $employee->monthly_salary, $percents);
            $structureData['employee_id'] = $employee->id;
            $structureData['effective_from'] = $employee->joining_date;
            $structureData['is_active'] = true;
            SalaryStructure::create($structureData);

            $balance = $this->leaveService->ensureBalance($employee);
            if ($request->filled('opening_leave')) {
                $this->leaveService->adjustBalance(
                    $employee,
                    (float) $request->input('opening_leave'),
                    0,
                    0,
                    'Opening leave on employee creation'
                );
            }

            $this->auditLogService->log('employee_created', "Employee created: {$employee->name}", $employee);

            return $employee;
        });

        $loginMsg = '';
        if ($employee->email) {
            try {
                $login = $this->employeeAccountService->ensureLogin($employee);
                $loginMsg = " Login created — Email: {$employee->email} | Password: {$login['password']}";
            } catch (\Throwable $e) {
                $loginMsg = ' (Login not created: ' . $e->getMessage() . ')';
            }
        }

        return redirect()->route('employees.show', $employee)->with('success', 'Employee created successfully.' . $loginMsg);
    }

    public function show(Employee $employee): View
    {
        $this->authorizeCompany($employee);
        $employee->load(['salaryStructure', 'leaveBalances', 'attendances' => fn ($q) => $q->latest()->limit(6)]);
        $fy = FinancialYearHelper::forDate();
        $leaveBalance = $employee->leaveBalances->firstWhere('financial_year', $fy);

        return view('employees.show', compact('employee', 'leaveBalance', 'fy'));
    }

    public function edit(Employee $employee): View
    {
        $this->authorizeCompany($employee);
        $employee->load('salaryStructure');
        $percents = $employee->salaryStructure
            ? [
                'basic_percent' => $employee->salaryStructure->basic_percent,
                'hra_percent' => $employee->salaryStructure->hra_percent,
                'other_allowance_percent' => $employee->salaryStructure->other_allowance_percent,
            ]
            : $this->salaryCalculationService->getComponentPercents(Auth::user()->company_id);

        return view('employees.edit', compact('employee', 'percents'));
    }

    public function update(EmployeeUpdateRequest $request, Employee $employee): RedirectResponse
    {
        $this->authorizeCompany($employee);
        $data = $request->validated();

        DB::transaction(function () use ($data, $request, $employee) {
            $old = $employee->toArray();

            if ($request->hasFile('photo')) {
                if ($employee->photo && file_exists(public_path('uploads/employees/' . $employee->photo))) {
                    @unlink(public_path('uploads/employees/' . $employee->photo));
                }
                $filename = time() . '_' . $request->file('photo')->hashName();
                $request->file('photo')->move(public_path('uploads/employees'), $filename);
                $data['photo'] = $filename;
            }

            $data['pan_number'] = isset($data['pan_number']) ? strtoupper($data['pan_number']) : null;
            $data['ifsc'] = isset($data['ifsc']) ? strtoupper($data['ifsc']) : null;
            unset($data['basic_percent'], $data['hra_percent'], $data['other_allowance_percent']);

            $salaryChanged = (float) $employee->monthly_salary !== (float) $data['monthly_salary'];
            $employee->update($data);

            $percents = [
                'basic_percent' => (float) ($request->input('basic_percent') ?? config('awhr.salary_components.basic_percent')),
                'hra_percent' => (float) ($request->input('hra_percent') ?? config('awhr.salary_components.hra_percent')),
                'other_allowance_percent' => (float) ($request->input('other_allowance_percent') ?? config('awhr.salary_components.other_allowance_percent')),
            ];

            if ($salaryChanged || $request->has('basic_percent')) {
                $this->salaryCalculationService->syncSalaryStructure($employee->fresh());
                // Override with custom percents if provided
                $structure = $employee->fresh()->salaryStructure;
                if ($structure) {
                    $structure->fill($percents);
                    $structure->recalculateAmounts();
                    $structure->save();
                }
            }

            $this->auditLogService->log('employee_updated', "Employee updated: {$employee->name}", $employee, $old, $employee->fresh()->toArray());
        });

        return redirect()->route('employees.show', $employee)->with('success', 'Employee updated successfully.');
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        $this->authorizeCompany($employee);
        $name = $employee->name;
        $employee->delete();
        $this->auditLogService->log('employee_deleted', "Employee deleted: {$name}", $employee);

        return redirect()->route('employees.index')->with('success', 'Employee deleted successfully.');
    }

    protected function authorizeCompany(Employee $employee): void
    {
        abort_unless($employee->company_id === Auth::user()->company_id, 403);
    }
}
