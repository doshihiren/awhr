<?php

namespace App\Services;

use App\Models\Company;
use App\Models\ProfessionalTaxRule;
use App\Models\Setting;

class ProfessionalTaxService
{
    public function getRule(?Company $company = null): ProfessionalTaxRule
    {
        if ($company) {
            $rule = $company->professionalTaxRules()->where('is_active', true)->first();
            if ($rule) {
                return $rule;
            }
        }

        // Fall back to config-driven ephemeral rule (settings override when company provided)
        $companyId = $company?->id;

        return new ProfessionalTaxRule([
            'name' => 'Default Professional Tax',
            'threshold' => $companyId
                ? Setting::getValue($companyId, 'professional_tax', 'threshold', config('awhr.professional_tax.threshold'))
                : config('awhr.professional_tax.threshold'),
            'amount' => $companyId
                ? Setting::getValue($companyId, 'professional_tax', 'amount', config('awhr.professional_tax.amount'))
                : config('awhr.professional_tax.amount'),
            'is_enabled' => $companyId
                ? Setting::getValue($companyId, 'professional_tax', 'enabled', config('awhr.professional_tax.enabled'))
                : config('awhr.professional_tax.enabled'),
            'is_active' => true,
        ]);
    }

    public function calculate(float $salary, ?Company $company = null): float
    {
        return $this->getRule($company)->calculate($salary);
    }
}
