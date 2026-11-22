<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Enlaces de "olvidé mi contraseña": cada token vence y sirve una sola vez
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tokens_recuperacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->char('token_hash', 64)->unique();   // se guarda cifrado, nunca el token original
            $table->timestamp('expira_en');
            $table->boolean('usado')->default(false);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tokens_recuperacion');
    }
};
