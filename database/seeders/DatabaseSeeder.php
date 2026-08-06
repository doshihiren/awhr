<?php

namespace Database\Seeders;

use App\Helpers\FinancialYearHelper;
use App\Models\Company;
use App\Models\DeductionType;
use App\Models\Employee;
use App\Models\ProfessionalTaxRule;
use App\Models\SalaryStructure;
use App\Models\Setting;
use App\Models\User;
use App\Services\LeaveService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Roles (future-ready)
        foreach (['admin', 'hr', 'manager', 'employee'] as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        $permissions = [
            'employees.manage', 'attendance.manage', 'leaves.manage',
            'payroll.manage', 'reports.view', 'settings.manage', 'users.manage',
        ];
        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }
        Role::findByName('admin')->syncPermissions($permissions);
        Role::findByName('hr')->syncPermissions([
            'employees.manage', 'attendance.manage', 'leaves.manage', 'payroll.manage', 'reports.view',
        ]);

        $company = Company::create([
            'name' => 'AWHR Technologies Pvt Ltd',
            'address' => "101 Business Park,\nAhmedabad, Gujarat 380015",
            'email' => 'hr@awhr.local',
            'phone' => '+91 98765 43210',
            'gstin' => '24AAAAA0000A1Z5',
            'pan' => 'AAAAA0000A',
            'is_active' => true,
        ]);

        $admin = User::create([
            'company_id' => $company->id,
            'name' => 'Admin User',
            'email' => 'admin@awhr.local',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('admin');

        ProfessionalTaxRule::create([
            'company_id' => $company->id,
            'name' => 'Default Professional Tax',
            'threshold' => 12000,
            'amount' => 200,
            'is_enabled' => true,
            'is_active' => true,
        ]);

        // Future-ready deduction types (disabled)
        $deductions = [
            ['code' => 'pf', 'name' => 'Provident Fund', 'is_statutory' => true],
            ['code' => 'esic', 'name' => 'ESIC', 'is_statutory' => true],
            ['code' => 'tds', 'name' => 'TDS', 'is_statutory' => true],
            ['code' => 'loan', 'name' => 'Loan Deduction', 'is_statutory' => false],
            ['code' => 'advance', 'name' => 'Salary Advance', 'is_statutory' => false],
            ['code' => 'other', 'name' => 'Other Deduction', 'is_statutory' => false],
        ];
        foreach ($deductions as $d) {
            DeductionType::create([
                'company_id' => $company->id,
                'code' => $d['code'],
                'name' => $d['name'],
                'calculation_type' => 'manual',
                'is_enabled' => false,
                'is_statutory' => $d['is_statutory'],
                'description' => 'Disabled initially — future ready module.',
            ]);
        }

        // Default settings
        Setting::setValue($company->id, 'salary_components', 'basic_percent', 50, 'number');
        Setting::setValue($company->id, 'salary_components', 'hra_percent', 40, 'number');
        Setting::setValue($company->id, 'salary_components', 'other_allowance_percent', 10, 'number');
        Setting::setValue($company->id, 'leave', 'annual_paid_leaves', 18, 'number');
        Setting::setValue($company->id, 'leave', 'monthly_accrual', 1.5, 'number');
        Setting::setValue($company->id, 'leave', 'minimum_balance', 0, 'number');
        Setting::setValue($company->id, 'payslip', 'header', 'Salary Slip', 'string');
        Setting::setValue($company->id, 'professional_tax', 'threshold', 12000, 'number');
        Setting::setValue($company->id, 'professional_tax', 'amount', 200, 'number');
        Setting::setValue($company->id, 'professional_tax', 'enabled', true, 'boolean');

        $leaveService = app(LeaveService::class);
        $fy = FinancialYearHelper::forDate();

        $sampleEmployees = [
            [
                'employee_code' => 'EMP001',
                'name' => 'Rahul Sharma',
                'gender' => 'male',
                'dob' => '1992-08-15',
                'joining_date' => '2022-04-01',
                'department' => 'Engineering',
                'designation' => 'Software Engineer',
                'mobile' => '9876543210',
                'email' => 'rahul@awhr.local',
                'pan_number' => 'ABCDE1234F',
                'aadhaar_number' => '123456789012',
                'bank_name' => 'HDFC Bank',
                'account_number' => '50100123456789',
                'ifsc' => 'HDFC0001234',
                'monthly_salary' => 30000,
            ],
            [
                'employee_code' => 'EMP002',
                'name' => 'Priya Patel',
                'gender' => 'female',
                'dob' => now()->copy()->subYears(28)->addDays(7)->format('Y-m-d'),
                'joining_date' => '2021-06-10',
                'department' => 'HR',
                'designation' => 'HR Executive',
                'mobile' => '9876543211',
                'email' => 'priya@awhr.local',
                'pan_number' => 'FGHIJ5678K',
                'bank_name' => 'ICICI Bank',
                'account_number' => '001234567890',
                'ifsc' => 'ICIC0000456',
                'monthly_salary' => 28000,
            ],
            [
                'employee_code' => 'EMP003',
                'name' => 'Amit Desai',
                'gender' => 'male',
                'dob' => '1988-03-22',
                'joining_date' => '2020-01-15',
                'department' => 'Finance',
                'designation' => 'Accountant',
                'mobile' => '9876543212',
                'email' => 'amit@awhr.local',
                'pan_number' => 'KLMNO9012P',
                'bank_name' => 'SBI',
                'account_number' => '30123456789',
                'ifsc' => 'SBIN0000789',
                'monthly_salary' => 35000,
            ],
        ];

        foreach ($sampleEmployees as $data) {
            $data['company_id'] = $company->id;
            $data['status'] = 'active';
            $data['address'] = 'Ahmedabad, Gujarat';
            $employee = Employee::create($data);

            $structure = SalaryStructure::buildFromGross((float) $employee->monthly_salary);
            $structure['employee_id'] = $employee->id;
            $structure['effective_from'] = $employee->joining_date;
            $structure['is_active'] = true;
            SalaryStructure::create($structure);

            $leaveService->ensureBalance($employee, $fy);
            $leaveService->adjustBalance($employee, 3, 0, 0, 'Opening balance seed', $fy);
        }

        $this->command?->info('AWHR seeded. Login: admin@awhr.local / password');
    }
}
