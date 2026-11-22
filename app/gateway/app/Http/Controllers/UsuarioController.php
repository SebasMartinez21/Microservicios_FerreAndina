<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Http\Request;

class UsuarioController extends Controller
{
    // GET /usuarios?q=&rolId=&activo=&pagina=&limite=
    public function index(Request $request)
    {
        $pagina = max((int) $request->input('pagina', 1), 1);
        $limite = min(max((int) $request->input('limite', 20), 1), 100);

        $consulta = Usuario::with('rol');
        if ($request->filled('q')) {
            $consulta->where(function ($busqueda) use ($request) {
                $busqueda->where('nombre', 'like', '%' . $request->q . '%')
                    ->orWhere('correo', 'like', '%' . $request->q . '%');
            });
        }
        if ($request->filled('rolId')) {
            $consulta->where('rol_id', (int) $request->rolId);
        }
        if ($request->filled('activo')) {
            $activo = filter_var($request->activo, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($activo !== null) {
                $consulta->where('activo', $activo);
            }
        }

        $total = $consulta->count();
        $datos = $consulta->orderBy('nombre')->skip(($pagina - 1) * $limite)->take($limite)->get();

        return response()->json(compact('pagina', 'limite', 'total', 'datos'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8',
            'rolId' => 'required|exists:roles,id',
        ]);

        if (Usuario::where('correo', $request->email)->exists()) {
            return response()->json([
                'codigo' => 'CORREO_DUPLICADO',
                'mensaje' => 'Ya existe un usuario con ese correo',
            ], 409);
        }

        $usuario = Usuario::create([
            'nombre' => $request->nombre,
            'correo' => $request->email,
            'contrasena_hash' => $request->password,
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
            'email' => 'sometimes|email',
            'activo' => 'sometimes|boolean',
        ]);

        if ($request->filled('email') && Usuario::where('correo', $request->email)->where('id', '!=', $usuario->id)->exists()) {
            return response()->json([
                'codigo' => 'CORREO_DUPLICADO',
                'mensaje' => 'Ya existe un usuario con ese correo',
            ], 409);
        }

        if ($request->has('activo') && !$request->boolean('activo') && $request->user()->id === $usuario->id) {
            return response()->json([
                'codigo' => 'CONFLICTO',
                'mensaje' => 'Un administrador no puede desactivarse a sí mismo',
            ], 409);
        }

        $usuario->update(array_filter([
            'nombre' => $request->nombre,
            'correo' => $request->email,
            'activo' => $request->activo,
        ], fn ($valor) => $valor !== null));

        return response()->json($usuario->load('rol'));
    }

    // Baja lógica: el gateway deja de aceptar los tokens de un usuario inactivo
    public function destroy(Request $request, Usuario $usuario)
    {
        if ($request->user()->id === $usuario->id) {
            return response()->json([
                'codigo' => 'CONFLICTO',
                'mensaje' => 'Un administrador no puede desactivarse a sí mismo',
            ], 409);
        }

        $usuario->update(['activo' => false]);

        return response()->noContent();
    }

    public function asignarRol(Request $request, Usuario $usuario)
    {
        $request->validate(['rolId' => 'required|exists:roles,id']);

        $nuevoRol = Rol::find($request->rolId);
        if ($request->user()->id === $usuario->id && $nuevoRol->nombre !== 'ADMIN') {
            return response()->json([
                'codigo' => 'CONFLICTO',
                'mensaje' => 'Un administrador no puede quitarse a sí mismo el rol ADMIN',
            ], 409);
        }

        $usuario->update(['rol_id' => $request->rolId]);

        return response()->json($usuario->load('rol'));
    }

    public function roles()
    {
        return response()->json(Rol::all());
    }
}
