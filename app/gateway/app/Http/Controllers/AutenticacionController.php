<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AutenticacionController extends Controller
{
    public function login(Request $request)
    {
        $request->validate(['email' => 'required|email', 'password' => 'required']);

        $usuario = Usuario::where('correo', $request->email)->first();

        if (!$usuario || !Hash::check($request->password, $usuario->contrasena)) {
            return response()->json(['codigo' => 'CREDENCIALES_INVALIDAS', 'mensaje' => 'Correo o contraseña incorrectos'], 401);
        }

        if (!$usuario->activo) {
            return response()->json(['codigo' => 'USUARIO_INACTIVO', 'mensaje' => 'El usuario está desactivado'], 403);
        }

        $token = $usuario->createToken('sesion')->plainTextToken;

        return response()->json([
            'token' => $token,
            'tipo' => 'Bearer',
            'usuario' => $usuario,
        ]);
    }

    public function logout(Request $request)
    {
        // Borra el token actual, así ya no sirve para más peticiones
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function perfil(Request $request)
    {
        return response()->json($request->user());
    }

    public function cambiarPassword(Request $request)
    {
        $request->validate([
            'passwordActual' => 'required',
            'nuevaPassword' => 'required|min:8',
        ]);

        $usuario = $request->user();

        if (!Hash::check($request->passwordActual, $usuario->contrasena)) {
            return response()->json(['codigo' => 'CREDENCIALES_INVALIDAS', 'mensaje' => 'La contraseña actual no es correcta'], 400);
        }

        $usuario->update(['contrasena' => $request->nuevaPassword]);

        return response()->noContent();
    }
}
