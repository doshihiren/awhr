<?php

namespace App\Http\Controllers;

use App\Helpers\FinancialYearHelper;
use App\Models\Attendance;
use App\Models\AttendanceDay;
use App\Models\LeaveBalance;
use App\Models\LeaveTransaction;
use App\Models\PayrollDetail;
use App\Services\AttendanceDayService;
use App\Services\LeaveService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class EmployeePortalController extends Controller
{
    public function __construct(
        protected AttendanceDayService $attendanceDayService,
        protected LeaveService $leaveService
    ) {}

    public function dashboard(): View
    {
        $employee = $this->employee();
        $fy = FinancialYearHelper::forDate();
        $leave = $this->leaveService->ensureBalance($employee, $fy);

        $today = AttendanceDay::where('employee_id', $employee->id)
            ->whereDate('date', today())
            ->first();

        $monthDays = AttendanceDay::where('employee_id', $employee->id)
            ->whereMonth('date', now()->month)
            ->whereYear('date', now()->year)
            ->orderByDesc('date')
            ->get();

        $lateThisMonth = $monthDays->where('is_late', true)->count();
        $presentThisMonth = $monthDays->whereIn('status', ['present', 'half_day'])->count();

        $recentPayslips = PayrollDetail::with('payroll')
            ->where('employee_id', $employee->id)
            ->whereHas('payroll', fn ($q) => $q->whereIn('status', ['approved', 'locked', 'frozen', 'calculated']))
            ->latest()
            ->limit(6)
            ->get();

        $monthlyAttendance = Attendance::where('employee_id', $employee->id)
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->limit(6)
            ->get();

        return view('portal.dashboard', compact(
            'employee', 'leave', 'fy', 'today', 'monthDays',
            'lateThisMonth', 'presentThisMonth', 'recentPayslips', 'monthlyAttendance'
        ));
    }

    public function attendance(Request $request): View
    {
        $employee = $this->employee();
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $days = AttendanceDay::where('employee_id', $employee->id)
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->orderBy('date')
            ->get();

        $summary = Attendance::where('employee_id', $employee->id)
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        return view('portal.attendance', compact('employee', 'days', 'summary', 'month', 'year'));
    }

    public function leaves(Request $request): View
    {
        $employee = $this->employee();
        $fy = $request->input('financial_year', FinancialYearHelper::forDate());
        $balance = $this->leaveService->ensureBalance($employee, $fy);
        $transactions = LeaveTransaction::where('employee_id', $employee->id)
            ->where('financial_year', $fy)
            ->latest('transaction_date')
            ->paginate(20);
        $fyOptions = FinancialYearHelper::options();

        return view('portal.leaves', compact('employee', 'balance', 'transactions', 'fy', 'fyOptions'));
    }

    public function payslips(): View
    {
        $employee = $this->employee();
        $payslips = PayrollDetail::with('payroll')
            ->where('employee_id', $employee->id)
            ->whereHas('payroll', fn ($q) => $q->whereIn('status', ['approved', 'locked', 'frozen', 'calculated']))
            ->latest()
            ->paginate(12);

        return view('portal.payslips', compact('employee', 'payslips'));
    }

    public function downloadPayslip(PayrollDetail $detail): Response
    {
        $employee = $this->employee();
        abort_unless($detail->employee_id === $employee->id, 403);

        $detail->load(['employee', 'payroll.company']);
        $company = $detail->payroll->company;

        $pdf = Pdf::loadView('payslips.pdf', compact('detail', 'company'))->setPaper('a4');
        $filename = 'payslip_' . $employee->employee_code . '_' . str_replace(' ', '_', $detail->payroll->period_label) . '.pdf';

        return $pdf->download($filename);
    }

    public function checkIn(): RedirectResponse
    {
        $day = $this->attendanceDayService->checkIn($this->employee());
        $msg = $day->is_late
            ? "Checked in at {$day->check_in}. Marked late by {$day->late_minutes} minutes."
            : "Checked in successfully at {$day->check_in}.";

        return back()->with('success', $msg);
    }

    public function checkOut(): RedirectResponse
    {
        $day = $this->attendanceDayService->checkOut($this->employee());

        return back()->with('success', "Checked out successfully at {$day->check_out}.");
    }

    protected function employee()
    {
        $user = Auth::user();
        abort_unless($user->employee_id && $user->employee, 403, 'No employee profile linked to this login.');

        return $user->employee;
    }
}
