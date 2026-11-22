<?php

namespace App\Http\Middleware;

use App\Models\TokenRevocado;
use App\Models\Usuario;
use Closure;
use DomainException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use UnexpectedValueException;

// Revisa la firma y el vencimiento del JWT, que no esté revocado y que el usuario siga activo
class ValidarJwt
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        if (!$token) {
            throw new AuthenticationException();
        }

        try {
            $datosToken = JWT::decode($token, new Key(config('services.jwt.secreto'), 'HS256'));
        } catch (UnexpectedValueException | DomainException $error) {
            throw new AuthenticationException();
        }

        if (TokenRevocado::where('jti', $datosToken->jti)->exists()) {
            throw new AuthenticationException();
        }

        $usuario = Usuario::find($datosToken->sub);
        if (!$usuario || !$usuario->activo) {
            throw new AuthenticationException();
        }

        // Así $request->user() devuelve el usuario del token en los controladores
        $request->setUserResolver(fn () => $usuario);
        $request->attributes->set('jwt', $datosToken);

        return $next($request);
    }
}
