<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class UsuarioController extends Controller
{
    public function index(Request $request)
    {
        $usuarios = User::query();

        if ($request->q) {
            $usuarios->where('name', 'like', '%' . $request->q . '%')
                ->orWhere('email', 'like', '%' . $request->q . '%');
        }

        return response()->json($usuarios->get());
    }

    public function store(Request $request)
    {
        $datos = $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
            'rol' => 'in:ADMIN,OPERADOR',
        ]);

        $usuario = User::create($datos);

        return response()->json($usuario, 201);
    }

    public function show(User $usuario)
    {
        return response()->json($usuario);
    }

    public function update(Request $request, User $usuario)
    {
        $datos = $request->validate([
            'name' => 'sometimes|required',
            'email' => 'sometimes|email|unique:users,email,' . $usuario->id,
            'activo' => 'sometimes|boolean',
        ]);

        $usuario->update($datos);

        return response()->json($usuario);
    }

    // Baja lógica: se desactiva y se le cierran las sesiones
    public function destroy(User $usuario)
    {
        $usuario->update(['activo' => false]);
        $usuario->tokens()->delete();

        return response()->noContent();
    }

    public function asignarRol(Request $request, User $usuario)
    {
        $request->validate(['rol' => 'required|in:ADMIN,OPERADOR']);

        $usuario->update(['rol' => $request->rol]);

        return response()->json($usuario);
    }

    public function roles()
    {
        return response()->json(['ADMIN', 'OPERADOR']);
    }
}
