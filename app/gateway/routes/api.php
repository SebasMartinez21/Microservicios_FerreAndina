<?php

use App\Http\Controllers\AutenticacionController;
use App\Http\Controllers\ProxyController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Support\Facades\Route;

// Microservicios a los que el gateway puede reenviar
$servicios = 'catalogo|inventario|compras|notificaciones|reportes';

Route::get('/health', fn () => ['estado' => 'ok']);
Route::post('/auth/login', [AutenticacionController::class, 'login']);

// Documentación (Swagger) del gateway
Route::get('/docs', fn () => view('docs'));
Route::get('/docs/openapi.yaml', fn () => response()->file(base_path('openapi.yaml'), ['Content-Type' => 'text/yaml']));

// La documentación (Swagger) de cada microservicio es pública
Route::get('/{servicio}/{ruta}', [ProxyController::class, 'reenviar'])
    ->where(['servicio' => $servicios, 'ruta' => 'api-docs.*']);

Route::middleware('jwt')->group(function () use ($servicios) {
    Route::post('/auth/logout', [AutenticacionController::class, 'logout']);
    Route::get('/auth/perfil', [AutenticacionController::class, 'perfil']);
    Route::post('/auth/cambiar-password', [AutenticacionController::class, 'cambiarPassword']);

    Route::middleware('admin')->group(function () {
        Route::get('/usuarios', [UsuarioController::class, 'index']);
        Route::post('/usuarios', [UsuarioController::class, 'store']);
        Route::get('/usuarios/{usuario}', [UsuarioController::class, 'show']);
        Route::put('/usuarios/{usuario}', [UsuarioController::class, 'update']);
        Route::delete('/usuarios/{usuario}', [UsuarioController::class, 'destroy']);
        Route::put('/usuarios/{usuario}/rol', [UsuarioController::class, 'asignarRol']);
        Route::get('/roles', [UsuarioController::class, 'roles']);
    });

    // Reportes es solo para ADMIN
    Route::any('/{servicio}/{ruta?}', [ProxyController::class, 'reenviar'])
        ->where(['servicio' => 'reportes', 'ruta' => '.*'])
        ->middleware('admin');

    // Todo lo demás se reenvía al microservicio: /api/catalogo/productos, /api/inventario/stock/1, ...
    Route::any('/{servicio}/{ruta?}', [ProxyController::class, 'reenviar'])
        ->where(['servicio' => $servicios, 'ruta' => '.*']);
});
