<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Sesiones cerradas: un JWT sigue vigente hasta que vence, por eso se guarda su jti al cerrar sesión
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tokens_revocados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->string('jti', 36)->unique();
            $table->timestamp('expira_en');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tokens_revocados');
    }
};
