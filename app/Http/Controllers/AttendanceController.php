<?php

namespace App\Http\Controllers;

use App\Http\Requests\AttendanceStoreRequest;
use App\Models\Attendance;
use App\Models\Employee;
use App\Services\AuditLogService;
use App\Services\SalaryCalculationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class AttendanceController extends Controller
{
    public function __construct(
        protected SalaryCalculationService $salaryCalculationService,
        protected AuditLogService $auditLogService
    ) {}

    public function index(Request $request): View
    {
        $companyId = Auth::user()->company_id;
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $attendances = Attendance::with('employee')
            ->whereHas('employee', fn ($q) => $q->where('company_id', $companyId))
            ->where('month', $month)
            ->where('year', $year)
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $employees = Employee::where('company_id', $companyId)->active()->orderBy('name')->get();

        return view('attendance.index', compact('attendances', 'employees', 'month', 'year'));
    }

    public function store(AttendanceStoreRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $employee = Employee::findOrFail($data['employee_id']);
        abort_unless($employee->company_id === Auth::user()->company_id, 403);

        $data['lop_days'] = $data['lop_days'] ?? max(0, $data['working_days'] - $data['present_days']);
        $data['overtime_days'] = $data['overtime_days'] ?? 0;
        $data['created_by'] = Auth::id();

        $attendance = Attendance::updateOrCreate(
            [
                'employee_id' => $data['employee_id'],
                'month' => $data['month'],
                'year' => $data['year'],
            ],
            $data
        );

        $preview = $this->salaryCalculationService->calculateForEmployee($employee, $attendance);

        $this->auditLogService->log(
            'attendance_saved',
            "Attendance saved for {$employee->name} ({$attendance->period_label})",
            $attendance
        );

        return redirect()
            ->route('attendance.index', ['month' => $attendance->month, 'year' => $attendance->year])
            ->with('success', "Attendance saved. Estimated net salary: ₹" . number_format($preview['net_salary'], 2));
    }

    public function edit(Attendance $attendance): View
    {
        abort_unless($attendance->employee->company_id === Auth::user()->company_id, 403);
        $employees = Employee::where('company_id', Auth::user()->company_id)->active()->orderBy('name')->get();

        return view('attendance.edit', compact('attendance', 'employees'));
    }

    public function update(AttendanceStoreRequest $request, Attendance $attendance): RedirectResponse
    {
        abort_unless($attendance->employee->company_id === Auth::user()->company_id, 403);
        $data = $request->validated();
        $data['lop_days'] = $data['lop_days'] ?? max(0, $data['working_days'] - $data['present_days']);

        $attendance->update($data);
        $this->auditLogService->log('attendance_updated', "Attendance updated for {$attendance->employee->name}", $attendance);

        return redirect()->route('attendance.index', ['month' => $attendance->month, 'year' => $attendance->year])
            ->with('success', 'Attendance updated successfully.');
    }

    public function destroy(Attendance $attendance): RedirectResponse
    {
        abort_unless($attendance->employee->company_id === Auth::user()->company_id, 403);
        $month = $attendance->month;
        $year = $attendance->year;
        $this->auditLogService->log('attendance_deleted', "Attendance deleted for {$attendance->employee->name}", $attendance);
        $attendance->delete();

        return redirect()->route('attendance.index', compact('month', 'year'))
            ->with('success', 'Attendance deleted.');
    }
}
