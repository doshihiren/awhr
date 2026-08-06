<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_structures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->decimal('monthly_gross', 12, 2);
            $table->decimal('basic_percent', 5, 2)->default(50);
            $table->decimal('hra_percent', 5, 2)->default(40);
            $table->decimal('other_allowance_percent', 5, 2)->default(10);
            $table->decimal('basic_amount', 12, 2);
            $table->decimal('hra_amount', 12, 2);
            $table->decimal('other_allowance_amount', 12, 2);
            $table->date('effective_from')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['employee_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salary_structures');
    }
};
