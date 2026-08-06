<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professional_tax_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name')->default('Default Professional Tax');
            $table->decimal('threshold', 12, 2)->default(12000);
            $table->decimal('amount', 12, 2)->default(200);
            $table->boolean('is_enabled')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('deduction_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('code')->unique(); // pf, esic, tds, loan, advance, other
            $table->string('name');
            $table->enum('calculation_type', ['fixed', 'percent', 'manual'])->default('manual');
            $table->decimal('default_value', 12, 2)->nullable();
            $table->boolean('is_enabled')->default(false); // disabled initially
            $table->boolean('is_statutory')->default(false);
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deduction_types');
        Schema::dropIfExists('professional_tax_rules');
    }
};
