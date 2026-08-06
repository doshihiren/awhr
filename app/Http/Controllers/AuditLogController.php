<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class AuditLogController extends Controller
{
    public function index(Request $request): View
    {
        $logs = AuditLog::with('user')
            ->where('company_id', Auth::user()->company_id)
            ->when($request->action, fn ($q) => $q->where('action', $request->action))
            ->when($request->search, function ($q) use ($request) {
                $q->where('description', 'like', '%' . $request->search . '%');
            })
            ->latest()
            ->paginate(30)
            ->withQueryString();

        $actions = AuditLog::where('company_id', Auth::user()->company_id)
            ->distinct()
            ->pluck('action');

        return view('audit-logs.index', compact('logs', 'actions'));
    }
}
