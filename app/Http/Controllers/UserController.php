<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;

class UserController extends Controller
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    public function index(): View
    {
        $users = User::where('company_id', Auth::user()->company_id)->latest()->paginate(20);

        return view('users.index', compact('users'));
    }

    public function create(): View
    {
        // Future-ready roles: admin, hr, manager, employee
        $roles = ['admin' => 'Admin', 'hr' => 'HR', 'manager' => 'Manager', 'employee' => 'Employee'];

        return view('users.create', compact('roles'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['required', Rule::in(['admin', 'hr', 'manager', 'employee'])],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $user = User::create([
            'company_id' => Auth::user()->company_id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        $user->assignRole($validated['role']);

        $this->auditLogService->log('user_created', "User created: {$user->email}", $user);

        return redirect()->route('users.index')->with('success', 'User created successfully.');
    }

    public function edit(User $user): View
    {
        abort_unless($user->company_id === Auth::user()->company_id, 403);
        $roles = ['admin' => 'Admin', 'hr' => 'HR', 'manager' => 'Manager', 'employee' => 'Employee'];

        return view('users.edit', compact('user', 'roles'));
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->company_id === Auth::user()->company_id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'role' => ['required', Rule::in(['admin', 'hr', 'manager', 'employee'])],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->role = $validated['role'];
        $user->is_active = $request->boolean('is_active', true);

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();
        $user->syncRoles([$validated['role']]);

        $this->auditLogService->log('user_updated', "User updated: {$user->email}", $user);

        return redirect()->route('users.index')->with('success', 'User updated.');
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_unless($user->company_id === Auth::user()->company_id, 403);
        abort_if($user->id === Auth::id(), 400, 'Cannot delete your own account.');

        $email = $user->email;
        $user->delete();
        $this->auditLogService->log('user_deleted', "User deleted: {$email}");

        return redirect()->route('users.index')->with('success', 'User deleted.');
    }
}
