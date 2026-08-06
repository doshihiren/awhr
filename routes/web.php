<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AttendanceImportController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\BankTransferController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeAccountController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\EmployeePortalController;
use App\Http\Controllers\Form16Controller;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\PayslipController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (!auth()->check()) {
        return redirect()->route('login');
    }

    return auth()->user()->role === 'employee'
        ? redirect()->route('portal.dashboard')
        : redirect()->route('dashboard');
});

Route::middleware(['auth'])->group(function () {
    // Shared profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Employee Self-Service Portal
    Route::prefix('portal')->name('portal.')->group(function () {
        Route::get('/dashboard', [EmployeePortalController::class, 'dashboard'])->name('dashboard');
        Route::get('/attendance', [EmployeePortalController::class, 'attendance'])->name('attendance');
        Route::get('/leaves', [EmployeePortalController::class, 'leaves'])->name('leaves');
        Route::get('/payslips', [EmployeePortalController::class, 'payslips'])->name('payslips');
        Route::get('/payslips/{detail}/download', [EmployeePortalController::class, 'downloadPayslip'])->name('payslips.download');
        Route::post('/check-in', [EmployeePortalController::class, 'checkIn'])->name('check-in');
        Route::post('/check-out', [EmployeePortalController::class, 'checkOut'])->name('check-out');
    });

    // Admin / HR modules
    Route::middleware(['staff'])->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::post('/notifications/{notification}/read', [DashboardController::class, 'markNotificationRead'])->name('notifications.read');

        Route::resource('employees', EmployeeController::class);
        Route::get('/employee-accounts', [EmployeeAccountController::class, 'index'])->name('employee-accounts.index');
        Route::post('/employee-accounts/{employee}', [EmployeeAccountController::class, 'createForEmployee'])->name('employee-accounts.create');
        Route::post('/employee-accounts-create-all', [EmployeeAccountController::class, 'createAll'])->name('employee-accounts.create-all');

        Route::get('/attendance', [AttendanceController::class, 'index'])->name('attendance.index');
        Route::post('/attendance', [AttendanceController::class, 'store'])->name('attendance.store');
        Route::get('/attendance/{attendance}/edit', [AttendanceController::class, 'edit'])->name('attendance.edit');
        Route::put('/attendance/{attendance}', [AttendanceController::class, 'update'])->name('attendance.update');
        Route::delete('/attendance/{attendance}', [AttendanceController::class, 'destroy'])->name('attendance.destroy');

        Route::get('/attendance-daily', [AttendanceImportController::class, 'dailyIndex'])->name('attendance.daily');
        Route::get('/attendance-import', [AttendanceImportController::class, 'index'])->name('attendance.import');
        Route::post('/attendance-import', [AttendanceImportController::class, 'import'])->name('attendance.import.store');
        Route::get('/attendance-import/template/daily', [AttendanceImportController::class, 'downloadDailyTemplate'])->name('attendance.template.daily');
        Route::get('/attendance-import/template/monthly', [AttendanceImportController::class, 'downloadMonthlyTemplate'])->name('attendance.template.monthly');

        Route::get('/leaves', [LeaveController::class, 'index'])->name('leaves.index');
        Route::get('/leaves/{employee}', [LeaveController::class, 'show'])->name('leaves.show');
        Route::post('/leaves/{employee}/adjust', [LeaveController::class, 'adjust'])->name('leaves.adjust');
        Route::post('/leaves/{employee}/take', [LeaveController::class, 'take'])->name('leaves.take');
        Route::post('/leaves/accrue-all', [LeaveController::class, 'accrueAll'])->name('leaves.accrue-all');

        Route::get('/payroll', [PayrollController::class, 'index'])->name('payroll.index');
        Route::get('/payroll/create', [PayrollController::class, 'create'])->name('payroll.create');
        Route::post('/payroll', [PayrollController::class, 'store'])->name('payroll.store');
        Route::get('/payroll/{payroll}', [PayrollController::class, 'show'])->name('payroll.show');
        Route::post('/payroll/{payroll}/calculate', [PayrollController::class, 'calculate'])->name('payroll.calculate');
        Route::post('/payroll/{payroll}/freeze', [PayrollController::class, 'freeze'])->name('payroll.freeze');
        Route::post('/payroll/{payroll}/approve', [PayrollController::class, 'approve'])->name('payroll.approve');
        Route::post('/payroll/{payroll}/lock', [PayrollController::class, 'lock'])->name('payroll.lock');
        Route::get('/payroll-details/{detail}/edit', [PayrollController::class, 'editDetail'])->name('payroll.details.edit');
        Route::put('/payroll-details/{detail}', [PayrollController::class, 'updateDetail'])->name('payroll.details.update');

        Route::get('/payroll/{payroll}/payslips', [PayslipController::class, 'index'])->name('payslips.index');
        Route::get('/payslips/{detail}', [PayslipController::class, 'show'])->name('payslips.show');
        Route::get('/payslips/{detail}/download', [PayslipController::class, 'download'])->name('payslips.download');
        Route::get('/payroll/{payroll}/payslips/download-all', [PayslipController::class, 'downloadAll'])->name('payslips.download-all');

        Route::get('/form16', [Form16Controller::class, 'index'])->name('form16.index');
        Route::get('/form16/{employee}', [Form16Controller::class, 'show'])->name('form16.show');
        Route::get('/form16/{employee}/pdf', [Form16Controller::class, 'pdf'])->name('form16.pdf');
        Route::get('/form16/{employee}/excel', [Form16Controller::class, 'excel'])->name('form16.excel');

        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('/reports/salary-register', [ReportController::class, 'salaryRegister'])->name('reports.salary-register');
        Route::get('/reports/monthly-payroll', [ReportController::class, 'monthlyPayroll'])->name('reports.monthly-payroll');
        Route::get('/reports/yearly-payroll', [ReportController::class, 'yearlyPayroll'])->name('reports.yearly-payroll');
        Route::get('/reports/leave', [ReportController::class, 'leaveReport'])->name('reports.leave');
        Route::get('/reports/professional-tax', [ReportController::class, 'professionalTaxReport'])->name('reports.professional-tax');
        Route::get('/reports/salary-summary', [ReportController::class, 'salarySummary'])->name('reports.salary-summary');
        Route::get('/reports/employee-ledger/{employee?}', [ReportController::class, 'employeeLedger'])->name('reports.employee-ledger');

        Route::get('/bank-transfer', [BankTransferController::class, 'index'])->name('bank-transfer.index');
        Route::get('/bank-transfer/{payroll}/excel', [BankTransferController::class, 'excel'])->name('bank-transfer.excel');
        Route::get('/bank-transfer/{payroll}/csv', [BankTransferController::class, 'csv'])->name('bank-transfer.csv');

        Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
        Route::post('/settings/company', [SettingController::class, 'updateCompany'])->name('settings.company');
        Route::post('/settings/salary-components', [SettingController::class, 'updateSalaryComponents'])->name('settings.salary-components');
        Route::post('/settings/leave-rules', [SettingController::class, 'updateLeaveRules'])->name('settings.leave-rules');
        Route::post('/settings/professional-tax', [SettingController::class, 'updateProfessionalTax'])->name('settings.professional-tax');

        Route::resource('users', UserController::class)->except(['show']);
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    });
});

require __DIR__.'/auth.php';
