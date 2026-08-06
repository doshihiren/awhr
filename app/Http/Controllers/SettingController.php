<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\DeductionType;
use App\Models\ProfessionalTaxRule;
use App\Models\Setting;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class SettingController extends Controller
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    public function index(): View
    {
        $company = Auth::user()->company;
        $ptRule = $company->professionalTaxRules()->where('is_active', true)->first();
        $deductions = DeductionType::where('company_id', $company->id)->orWhereNull('company_id')->get();

        $salaryComponents = [
            'basic_percent' => Setting::getValue($company->id, 'salary_components', 'basic_percent', config('awhr.salary_components.basic_percent')),
            'hra_percent' => Setting::getValue($company->id, 'salary_components', 'hra_percent', config('awhr.salary_components.hra_percent')),
            'other_allowance_percent' => Setting::getValue($company->id, 'salary_components', 'other_allowance_percent', config('awhr.salary_components.other_allowance_percent')),
        ];

        $leaveRules = [
            'annual_paid_leaves' => Setting::getValue($company->id, 'leave', 'annual_paid_leaves', config('awhr.leave.annual_paid_leaves')),
            'monthly_accrual' => Setting::getValue($company->id, 'leave', 'monthly_accrual', config('awhr.leave.monthly_accrual')),
            'minimum_balance' => Setting::getValue($company->id, 'leave', 'minimum_balance', config('awhr.leave.minimum_balance')),
        ];

        $payslipHeader = Setting::getValue($company->id, 'payslip', 'header', config('awhr.company.payslip_header'));

        return view('settings.index', compact('company', 'ptRule', 'deductions', 'salaryComponents', 'leaveRules', 'payslipHeader'));
    }

    public function updateCompany(Request $request): RedirectResponse
    {
        $company = Auth::user()->company;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'gstin' => ['nullable', 'string', 'max:20'],
            'pan' => ['nullable', 'string', 'max:20'],
            'office_start_time' => ['nullable', 'date_format:H:i'],
            'late_grace_minutes' => ['nullable', 'integer', 'min:0', 'max:180'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'signature' => ['nullable', 'image', 'max:2048'],
            'payslip_header' => ['nullable', 'string', 'max:255'],
        ]);

        if (!empty($validated['office_start_time'])) {
            $validated['office_start_time'] = $validated['office_start_time'] . ':00';
        }
        if ($request->hasFile('logo')) {
            $filename = 'logo_' . time() . '.' . $request->file('logo')->extension();
            $request->file('logo')->move(public_path('uploads/logos'), $filename);
            $validated['logo'] = $filename;
        }

        if ($request->hasFile('signature')) {
            $filename = 'sig_' . time() . '.' . $request->file('signature')->extension();
            $request->file('signature')->move(public_path('uploads/signatures'), $filename);
            $validated['signature'] = $filename;
        }

        $payslipHeader = $validated['payslip_header'] ?? null;
        unset($validated['payslip_header']);

        $company->update($validated);

        if ($payslipHeader !== null) {
            Setting::setValue($company->id, 'payslip', 'header', $payslipHeader);
        }

        $this->auditLogService->log('settings_updated', 'Company settings updated', $company);

        return back()->with('success', 'Company settings saved.');
    }

    public function updateSalaryComponents(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'basic_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'hra_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'other_allowance_percent' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $sum = $validated['basic_percent'] + $validated['hra_percent'] + $validated['other_allowance_percent'];
        if (abs($sum - 100) > 0.01) {
            return back()->withErrors(['basic_percent' => 'Salary component percentages must total 100%.'])->withInput();
        }

        $companyId = Auth::user()->company_id;
        foreach ($validated as $key => $value) {
            Setting::setValue($companyId, 'salary_components', $key, $value, 'number');
        }

        $this->auditLogService->log('settings_updated', 'Salary components updated');

        return back()->with('success', 'Salary components saved.');
    }

    public function updateLeaveRules(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'annual_paid_leaves' => ['required', 'numeric', 'min:0'],
            'monthly_accrual' => ['required', 'numeric', 'min:0'],
            'minimum_balance' => ['required', 'numeric'],
        ]);

        $companyId = Auth::user()->company_id;
        foreach ($validated as $key => $value) {
            Setting::setValue($companyId, 'leave', $key, $value, 'number');
        }

        $this->auditLogService->log('settings_updated', 'Leave rules updated');

        return back()->with('success', 'Leave rules saved.');
    }

    public function updateProfessionalTax(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'threshold' => ['required', 'numeric', 'min:0'],
            'amount' => ['required', 'numeric', 'min:0'],
            'is_enabled' => ['nullable', 'boolean'],
        ]);

        $company = Auth::user()->company;
        $rule = $company->professionalTaxRules()->where('is_active', true)->first();

        $payload = [
            'company_id' => $company->id,
            'name' => 'Professional Tax',
            'threshold' => $validated['threshold'],
            'amount' => $validated['amount'],
            'is_enabled' => $request->boolean('is_enabled'),
            'is_active' => true,
        ];

        if ($rule) {
            $rule->update($payload);
        } else {
            ProfessionalTaxRule::create($payload);
        }

        Setting::setValue($company->id, 'professional_tax', 'threshold', $validated['threshold'], 'number');
        Setting::setValue($company->id, 'professional_tax', 'amount', $validated['amount'], 'number');
        Setting::setValue($company->id, 'professional_tax', 'enabled', $request->boolean('is_enabled'), 'boolean');

        $this->auditLogService->log('settings_updated', 'Professional tax rule updated');

        return back()->with('success', 'Professional tax rule saved.');
    }
}
