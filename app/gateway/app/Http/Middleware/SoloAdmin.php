<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SoloAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user()->esAdmin()) {
            return response()->json(['codigo' => 'SIN_PERMISO', 'mensaje' => 'Solo un ADMIN puede hacer esto'], 403);
        }

        return $next($request);
    }
}
