<?php

namespace App\Http\Controllers;

use App\Models\TokenRevocado;
use App\Models\Usuario;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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

        $duracion = config('services.jwt.duracion');
        $ahora = time();

        $token = JWT::encode([
            'sub' => (string) $usuario->id,
            'email' => $usuario->correo,
            'rol' => $usuario->rol->nombre,
            'jti' => (string) Str::uuid(),
            'iat' => $ahora,
            'exp' => $ahora + $duracion,
        ], config('services.jwt.secreto'), 'HS256');

        return response()->json([
            'token' => $token,
            'tipo' => 'Bearer',
            'expiraEn' => $duracion,
            'usuario' => $usuario,
        ]);
    }

    public function logout(Request $request)
    {
        // Guarda el jti del token actual, así ya no sirve para más peticiones
        $datosToken = $request->attributes->get('jwt');
        TokenRevocado::firstOrCreate(['jti' => $datosToken->jti], ['expira_en' => date('Y-m-d H:i:s', $datosToken->exp)]);

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
