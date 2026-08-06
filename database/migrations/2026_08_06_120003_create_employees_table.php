<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('employee_code')->unique();
            $table->string('name');
            $table->string('photo')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->date('dob')->nullable();
            $table->date('joining_date');
            $table->string('department')->nullable();
            $table->string('designation')->nullable();
            $table->string('mobile', 20)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('pan_number', 20)->nullable()->unique();
            $table->string('aadhaar_number', 20)->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('ifsc', 20)->nullable();
            $table->string('uan', 30)->nullable();
            $table->string('esic_number', 30)->nullable();
            $table->decimal('monthly_salary', 12, 2)->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index('joining_date');
        });

        // Add FK for users.employee_id now that employees exists
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('employee_id')->references('id')->on('employees')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
        });
        Schema::dropIfExists('employees');
    }
};
