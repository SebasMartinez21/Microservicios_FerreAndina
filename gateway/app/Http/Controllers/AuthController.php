<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['codigo' => 'NO_AUTENTICADO', 'mensaje' => 'Correo o contraseña incorrectos'], 401);
        }

        if (!$user->activo) {
            return response()->json(['codigo' => 'SIN_PERMISO', 'mensaje' => 'El usuario está desactivado'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'usuario' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        // Borra el token actual, así ya no sirve para más peticiones
        $request->user()->currentAccessToken()->delete();

        return response()->json(['mensaje' => 'Sesión cerrada correctamente']);
    }

    public function perfil(Request $request)
    {
        return response()->json($request->user());
    }

    public function cambiarPassword(Request $request)
    {
        $user = $request->user();

        if (!Hash::check($request->actual, $user->password)) {
            return response()->json(['codigo' => 'DATOS_INVALIDOS', 'mensaje' => 'La contraseña actual no es correcta'], 400);
        }

        if (strlen($request->nueva ?? '') < 6) {
            return response()->json(['codigo' => 'DATOS_INVALIDOS', 'mensaje' => 'La nueva contraseña debe tener mínimo 6 caracteres'], 400);
        }

        $user->update(['password' => $request->nueva]);

        return response()->json(['mensaje' => 'Contraseña actualizada']);
    }
}
