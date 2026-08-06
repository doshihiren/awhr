<?php

namespace Tests\Unit;

use App\Services\ProfessionalTaxService;
use App\Services\SalaryCalculationService;
use Tests\TestCase;

class SalaryCalculationTest extends TestCase
{
    public function test_proration_formula(): void
    {
        $service = new SalaryCalculationService(new ProfessionalTaxService());
        $earned = $service->calculateEarnedSalary(30000, 28, 30);
        $this->assertEquals(28000.0, $earned);
    }

    public function test_professional_tax_threshold(): void
    {
        $tax = new ProfessionalTaxService();
        $this->assertEquals(200.0, $tax->calculate(12000));
        $this->assertEquals(200.0, $tax->calculate(28000));
        $this->assertEquals(0.0, $tax->calculate(11999));
    }
}
