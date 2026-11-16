<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['admin' => \App\Http\Middleware\SoloAdmin::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Los errores de la API siempre se responden en JSON
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*'));

        // Errores con el mismo formato que los microservicios: { codigo, mensaje, detalles }
        $exceptions->render(fn (\Illuminate\Validation\ValidationException $error) => response()->json([
            'codigo' => 'DATOS_INVALIDOS',
            'mensaje' => 'Datos de entrada inválidos',
            'detalles' => collect($error->errors())->flatten()->all(),
        ], 400));

        $exceptions->render(fn (\Illuminate\Auth\AuthenticationException $error) => response()->json([
            'codigo' => 'NO_AUTENTICADO',
            'mensaje' => 'Falta el token o no es válido',
        ], 401));

        $exceptions->render(fn (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $error) => response()->json([
            'codigo' => 'NO_ENCONTRADO',
            'mensaje' => 'No existe',
        ], 404));
    })->create();
