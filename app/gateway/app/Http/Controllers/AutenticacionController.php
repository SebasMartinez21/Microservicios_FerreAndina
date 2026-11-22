<?php

namespace App\Http\Controllers;

use App\Models\TokenRecuperacion;
use App\Models\TokenRevocado;
use App\Models\Usuario;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AutenticacionController extends Controller
{
    public function login(Request $request)
    {
        $request->validate(['email' => 'required|email', 'password' => 'required']);

        $usuario = Usuario::where('correo', $request->email)->first();

        if (!$usuario || !Hash::check($request->password, $usuario->contrasena_hash)) {
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
        TokenRevocado::firstOrCreate(
            ['jti' => $datosToken->jti],
            [
                'usuario_id' => $request->user()->id,
                'expira_en' => date('Y-m-d H:i:s', $datosToken->exp),
            ]
        );

        return response()->noContent();
    }

    public function perfil(Request $request)
    {
        return response()->json($request->user());
    }

    // Responde 202 siempre, exista o no el correo, para no revelar qué cuentas están registradas
    public function recuperar(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $usuario = Usuario::where('correo', $request->email)->first();

        if ($usuario && $usuario->activo) {
            $token = Str::random(64);

            TokenRecuperacion::create([
                'usuario_id' => $usuario->id,
                'token_hash' => hash('sha256', $token),
                'expira_en' => now()->addHour(),
            ]);

            // En desarrollo el correo se escribe en los logs del gateway (MAIL_MAILER=log)
            Mail::raw("Tu código para restablecer la contraseña es: $token\nVence en una hora.", function ($mensaje) use ($usuario) {
                $mensaje->to($usuario->correo)->subject('Recuperar contraseña - FerreAndina');
            });
        }

        return response()->json(null, 202);
    }

    public function restablecer(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'nuevaPassword' => 'required|min:8',
        ]);

        $recuperacion = TokenRecuperacion::where('token_hash', hash('sha256', $request->token))
            ->where('usado', false)
            ->where('expira_en', '>', now())
            ->first();

        if (!$recuperacion) {
            return response()->json(['codigo' => 'TOKEN_INVALIDO', 'mensaje' => 'El token no es válido, ya venció o ya se usó'], 400);
        }

        $recuperacion->usuario->update(['contrasena_hash' => $request->nuevaPassword]);
        $recuperacion->update(['usado' => true]);

        return response()->noContent();
    }

    public function cambiarPassword(Request $request)
    {
        $request->validate([
            'passwordActual' => 'required',
            'nuevaPassword' => 'required|min:8',
        ]);

        $usuario = $request->user();

        if (!Hash::check($request->passwordActual, $usuario->contrasena_hash)) {
            return response()->json(['codigo' => 'CREDENCIALES_INVALIDAS', 'mensaje' => 'La contraseña actual no es correcta'], 400);
        }

        $usuario->update(['contrasena_hash' => $request->nuevaPassword]);

        return response()->noContent();
    }
}
