<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'employee_code' => strtoupper($this->faker->unique()->bothify('EMP###')),
            'name' => $this->faker->name(),
            'gender' => $this->faker->randomElement(['male', 'female', 'other']),
            'dob' => $this->faker->dateTimeBetween('-50 years', '-20 years'),
            'joining_date' => $this->faker->dateTimeBetween('-5 years', 'now'),
            'department' => $this->faker->randomElement(['Engineering', 'HR', 'Finance', 'Sales', 'Operations']),
            'designation' => $this->faker->jobTitle(),
            'mobile' => $this->faker->numerify('##########'),
            'email' => $this->faker->unique()->safeEmail(),
            'address' => $this->faker->address(),
            'pan_number' => strtoupper($this->faker->unique()->bothify('?????####?')),
            'bank_name' => $this->faker->company() . ' Bank',
            'account_number' => $this->faker->bankAccountNumber(),
            'ifsc' => strtoupper($this->faker->bothify('????0######')),
            'monthly_salary' => $this->faker->numberBetween(15000, 80000),
            'status' => 'active',
        ];
    }
}
