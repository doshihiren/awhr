<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Employee;
use App\Models\User;
use App\Services\EmployeeAccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeePortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_is_redirected_to_portal_after_login(): void
    {
        $company = Company::factory()->create();
        $employee = Employee::factory()->create([
            'company_id' => $company->id,
            'email' => 'emp@example.com',
            'employee_code' => 'EMP100',
        ]);

        $result = app(EmployeeAccountService::class)->ensureLogin($employee);
        $user = $result['user'];

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'Emp@EMP100',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('portal.dashboard', absolute: false));
    }

    public function test_employee_can_view_portal_dashboard(): void
    {
        $company = Company::factory()->create();
        $employee = Employee::factory()->create([
            'company_id' => $company->id,
            'email' => 'emp2@example.com',
            'employee_code' => 'EMP101',
        ]);
        $result = app(EmployeeAccountService::class)->ensureLogin($employee);

        $response = $this->actingAs($result['user'])->get(route('portal.dashboard'));
        $response->assertOk();
        $response->assertSee('Check In');
    }

    public function test_employee_cannot_access_admin_dashboard(): void
    {
        $company = Company::factory()->create();
        $employee = Employee::factory()->create([
            'company_id' => $company->id,
            'email' => 'emp3@example.com',
            'employee_code' => 'EMP102',
        ]);
        $result = app(EmployeeAccountService::class)->ensureLogin($employee);

        $response = $this->actingAs($result['user'])->get(route('dashboard'));
        $response->assertRedirect(route('portal.dashboard'));
    }
}
