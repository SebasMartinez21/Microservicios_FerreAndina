<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Http\Request;

class UsuarioController extends Controller
{
    // GET /usuarios?q=&pagina=&limite=
    public function index(Request $request)
    {
        $pagina = max((int) $request->input('pagina', 1), 1);
        $limite = min(max((int) $request->input('limite', 20), 1), 100);

        $consulta = Usuario::with('rol');
        if ($request->q) {
            $consulta->where(function ($busqueda) use ($request) {
                $busqueda->where('nombre', 'like', '%' . $request->q . '%')
                    ->orWhere('correo', 'like', '%' . $request->q . '%');
            });
        }

        $total = $consulta->count();
        $datos = $consulta->orderBy('nombre')->skip(($pagina - 1) * $limite)->take($limite)->get();

        return response()->json(compact('pagina', 'limite', 'total', 'datos'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required',
            'email' => 'required|email|unique:usuarios,correo',
            'password' => 'required|min:8',
            'rolId' => 'required|exists:roles,id',
        ]);

        $usuario = Usuario::create([
            'nombre' => $request->nombre,
            'correo' => $request->email,
            'contrasena' => $request->password,
            'rol_id' => $request->rolId,
        ]);

        return response()->json($usuario->load('rol'), 201);
    }

    public function show(Usuario $usuario)
    {
        return response()->json($usuario->load('rol'));
    }

    public function update(Request $request, Usuario $usuario)
    {
        $request->validate([
            'nombre' => 'sometimes|required',
            'email' => 'sometimes|email|unique:usuarios,correo,' . $usuario->id,
            'activo' => 'sometimes|boolean',
        ]);

        $usuario->update(array_filter([
            'nombre' => $request->nombre,
            'correo' => $request->email,
            'activo' => $request->activo,
        ], fn ($valor) => $valor !== null));

        return response()->json($usuario->load('rol'));
    }

    // Baja lógica: el gateway deja de aceptar los tokens de un usuario inactivo
    public function destroy(Usuario $usuario)
    {
        $usuario->update(['activo' => false]);

        return response()->noContent();
    }

    public function asignarRol(Request $request, Usuario $usuario)
    {
        $request->validate(['rolId' => 'required|exists:roles,id']);

        $usuario->update(['rol_id' => $request->rolId]);

        return response()->json($usuario->load('rol'));
    }

    public function roles()
    {
        return response()->json(Rol::all());
    }
}
