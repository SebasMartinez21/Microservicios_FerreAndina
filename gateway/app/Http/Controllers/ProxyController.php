<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

// Reenvía las peticiones al microservicio que corresponde.
// Ejemplo: GET /api/catalogo/productos  ->  GET http://catalogo:3000/productos
class ProxyController extends Controller
{
    public function reenviar(Request $request, string $servicio, string $ruta = '')
    {
        $url = config("services.microservicios.$servicio") . '/' . $ruta;
        $usuario = $request->user();

        // El token compartido le dice al microservicio que la petición viene del gateway,
        // y las cabeceras X-Usuario-* le dicen quién es el usuario y qué rol tiene
        $cabeceras = [
            'X-Gateway-Token' => config('services.microservicios.token'),
            'X-Usuario-Id' => $usuario?->id,
            'X-Usuario-Rol' => $usuario?->rol,
            'Accept' => $request->header('Accept', 'application/json'),
        ];

        $opciones = ['query' => $request->query()];
        if (!in_array($request->method(), ['GET', 'DELETE'])) {
            $opciones['json'] = $request->json()->all();
        }

        try {
            $respuesta = Http::withHeaders($cabeceras)
                ->timeout(10)
                ->send($request->method(), $url, $opciones);
        } catch (ConnectionException $e) {
            return response()->json([
                'codigo' => 'SERVICIO_NO_DISPONIBLE',
                'mensaje' => "No se pudo conectar con el microservicio de $servicio",
            ], 503);
        }

        // Se devuelve tal cual lo que respondió el microservicio
        return response($respuesta->body(), $respuesta->status())
            ->header('Content-Type', $respuesta->header('Content-Type') ?: 'application/json');
    }
}
