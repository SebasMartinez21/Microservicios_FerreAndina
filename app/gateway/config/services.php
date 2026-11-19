<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    // Direcciones internas de los microservicios (nombres del docker-compose)
    'microservicios' => [
        'token' => env('GATEWAY_TOKEN'),
        'catalogo' => env('CATALOGO_URL', 'http://catalogo:3000'),
        'inventario' => env('INVENTARIO_URL', 'http://inventario:3000'),
        'compras' => env('COMPRAS_URL', 'http://compras:3000'),
        'notificaciones' => env('NOTIFICACIONES_URL', 'http://notificaciones:3000'),
        'reportes' => env('REPORTES_URL', 'http://reportes:3000'),
    ],

    // Firma y duración (en segundos) de los JWT que entrega el login
    'jwt' => [
        'secreto' => env('JWT_SECRET'),
        'duracion' => 3600,
    ],

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
