<?php

namespace App\Http\Controllers;

use App\Exports\GenericArrayExport;
use App\Helpers\FinancialYearHelper;
use App\Models\AttendanceDay;
use App\Models\Employee;
use App\Services\AttendanceDayService;
use App\Services\EmployeeAccountService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceImportController extends Controller
{
    public function __construct(
        protected AttendanceDayService $attendanceDayService
    ) {}

    public function index(): View
    {
        [$fyStart] = FinancialYearHelper::range(FinancialYearHelper::forDate());

        return view('attendance.import', [
            'fyStart' => $fyStart,
            'fy' => FinancialYearHelper::forDate(),
        ]);
    }

    public function downloadDailyTemplate(): StreamedResponse
    {
        $fy = FinancialYearHelper::forDate();
        [$start, $end] = FinancialYearHelper::range($fy);
        // Template from 1 April of current FY through today (or end of first month sample)
        $sampleEnd = now()->lt($end) ? now() : $end->copy();
        if ($sampleEnd->lt($start)) {
            $sampleEnd = $start->copy()->endOfMonth();
        }

        $employees = Employee::where('company_id', Auth::user()->company_id)
            ->active()
            ->orderBy('employee_code')
            ->get();

        $filename = 'attendance_daily_template_' . $fy . '.csv';

        return response()->streamDownload(function () use ($employees, $start, $sampleEnd) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['employee_code', 'date', 'status', 'check_in', 'check_out', 'remarks']);

            // Provide blank rows for each employee for first 7 days as samples + header guidance
            foreach ($employees as $employee) {
                for ($d = $start->copy(); $d->lte($start->copy()->addDays(6)); $d->addDay()) {
                    $status = $d->isWeekend() ? 'week_off' : 'present';
                    fputcsv($out, [
                        $employee->employee_code,
                        $d->format('Y-m-d'),
                        $status,
                        $status === 'present' ? '09:30' : '',
                        $status === 'present' ? '18:30' : '',
                        '',
                    ]);
                }
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function downloadMonthlyTemplate(): StreamedResponse
    {
        $fy = FinancialYearHelper::forDate();
        [$start] = FinancialYearHelper::range($fy);
        $employees = Employee::where('company_id', Auth::user()->company_id)->active()->orderBy('employee_code')->get();

        return response()->streamDownload(function () use ($employees, $start) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['employee_code', 'month', 'year', 'working_days', 'present_days', 'lop_days', 'late_days', 'overtime_days', 'remarks']);

            foreach ($employees as $employee) {
                // April of current FY as starting month sample
                fputcsv($out, [
                    $employee->employee_code,
                    $start->month,
                    $start->year,
                    22,
                    20,
                    2,
                    0,
                    0,
                    'Sample - edit and upload',
                ]);
            }
            fclose($out);
        }, 'attendance_monthly_template_' . $fy . '.csv', ['Content-Type' => 'text/csv']);
    }

    public function import(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:daily,monthly'],
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls'],
        ]);

        $rows = $this->parseUpload($request->file('file'));
        $company = Auth::user()->company;

        $result = $validated['type'] === 'daily'
            ? $this->attendanceDayService->importDailyRows($company, $rows)
            : $this->attendanceDayService->importMonthlyRows($company, $rows);

        $message = "Imported {$result['imported']} row(s).";
        if (!empty($result['errors'])) {
            return back()
                ->with('success', $message)
                ->with('import_errors', $result['errors']);
        }

        return back()->with('success', $message);
    }

    public function dailyIndex(Request $request): View
    {
        $companyId = Auth::user()->company_id;
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $days = AttendanceDay::with('employee')
            ->whereHas('employee', fn ($q) => $q->where('company_id', $companyId))
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->when($request->employee_id, fn ($q) => $q->where('employee_id', $request->employee_id))
            ->orderByDesc('date')
            ->paginate(30)
            ->withQueryString();

        $employees = Employee::where('company_id', $companyId)->active()->orderBy('name')->get();

        return view('attendance.daily', compact('days', 'employees', 'month', 'year'));
    }

    protected function parseUpload($file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if (in_array($extension, ['xlsx', 'xls'], true)) {
            $sheet = Excel::toArray(null, $file);
            $raw = $sheet[0] ?? [];
            if (empty($raw)) {
                return [];
            }
            $headers = array_map(fn ($h) => strtolower(trim((string) $h)), array_shift($raw));
            $rows = [];
            foreach ($raw as $line) {
                if (count(array_filter($line, fn ($v) => $v !== null && $v !== '')) === 0) {
                    continue;
                }
                $rows[] = array_combine($headers, array_pad(array_values($line), count($headers), null));
            }

            return $rows;
        }

        // CSV
        $handle = fopen($file->getRealPath(), 'r');
        $headers = array_map(fn ($h) => strtolower(trim((string) $h)), fgetcsv($handle) ?: []);
        $rows = [];
        while (($data = fgetcsv($handle)) !== false) {
            if (count(array_filter($data)) === 0) {
                continue;
            }
            $rows[] = array_combine($headers, array_pad($data, count($headers), null));
        }
        fclose($handle);

        return $rows;
    }
}
