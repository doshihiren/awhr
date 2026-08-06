<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceDay;
use App\Models\Company;
use App\Models\Employee;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class EmployeeAccountService
{
    /**
     * Create or reset login for an employee.
     * Default password = Emp@{employee_code}
     */
    public function ensureLogin(Employee $employee, ?string $password = null, bool $resetPassword = false): array
    {
        if (empty($employee->email)) {
            throw ValidationException::withMessages([
                'email' => 'Employee must have an email address to create a login.',
            ]);
        }

        $defaultPassword = $password ?: ('Emp@' . $employee->employee_code);
        $user = User::where('employee_id', $employee->id)->first()
            ?? User::where('email', $employee->email)->first();

        if ($user) {
            $user->fill([
                'company_id' => $employee->company_id,
                'employee_id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'role' => $user->role === 'admin' ? 'admin' : 'employee',
                'is_active' => $employee->status === 'active',
            ]);

            if ($resetPassword || $password) {
                $user->password = $defaultPassword;
            }

            $user->save();
        } else {
            $user = User::create([
                'company_id' => $employee->company_id,
                'employee_id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'password' => $defaultPassword,
                'role' => 'employee',
                'is_active' => $employee->status === 'active',
                'email_verified_at' => now(),
            ]);

            if (method_exists($user, 'assignRole')) {
                try {
                    $user->assignRole('employee');
                } catch (\Throwable $e) {
                    // Role may not exist yet on some installs
                }
            }
        }

        return [
            'user' => $user,
            'password' => $defaultPassword,
            'created' => $user->wasRecentlyCreated,
        ];
    }

    public function ensureLoginsForCompany(int $companyId, bool $resetPassword = false): int
    {
        $count = 0;
        Employee::where('company_id', $companyId)
            ->where('status', 'active')
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->each(function (Employee $employee) use ($resetPassword, &$count) {
                $this->ensureLogin($employee, null, $resetPassword);
                $count++;
            });

        return $count;
    }
}
