@extends('layouts.app')

@section('title', 'Users')
@section('page_title', 'Users')
@section('page_subtitle', 'Manage application access')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="page-title h4 mb-0">Application Users</h1>
    <a href="{{ route('users.create') }}" class="btn btn-awhr"><i class="bi bi-person-plus me-1"></i>Add User</a>
</div>

<div class="panel">
    <div class="panel-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light"><tr><th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Created</th><th class="text-end">Actions</th></tr></thead>
                <tbody>
                    @forelse($users as $user)
                        <tr>
                            <td>
                                <div class="d-flex align-items-center gap-2">
                                    <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold" style="width:38px;height:38px">
                                        {{ strtoupper(substr($user->name, 0, 1)) }}
                                    </div>
                                    <div><div class="fw-semibold">{{ $user->name }}</div><small class="text-muted">{{ $user->email }}</small></div>
                                </div>
                            </td>
                            <td><span class="badge text-bg-light">{{ ucfirst($user->role) }}</span></td>
                            <td><span class="badge {{ $user->is_active ? 'text-bg-success' : 'text-bg-secondary' }}">{{ $user->is_active ? 'Active' : 'Inactive' }}</span></td>
                            <td>{{ $user->last_login_at?->format('d M Y, h:i A') ?? 'Never' }}</td>
                            <td>{{ $user->created_at->format('d M Y') }}</td>
                            <td class="text-end text-nowrap">
                                <a href="{{ route('users.edit', $user) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil"></i></a>
                                @if($user->id !== Auth::id())
                                    <form method="POST" action="{{ route('users.destroy', $user) }}" class="d-inline" onsubmit="return confirm('Delete this user account?')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                                    </form>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="text-center text-muted py-5">No users found.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($users->hasPages())<div class="p-3 border-top">{{ $users->links() }}</div>@endif
    </div>
</div>
@endsection
