<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class Usuario extends Authenticatable
{
    protected $table = 'usuarios';
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $fillable = ['nombre', 'correo', 'contrasena_hash', 'rol_id', 'activo'];

    protected function casts(): array
    {
        return [
            'contrasena_hash' => 'hashed',   // Laravel la cifra sola al guardarla
            'activo' => 'boolean',
        ];
    }

    // Laravel busca la contraseña en "password"; aquí la columna se llama "contrasena_hash"
    public function getAuthPassword()
    {
        return $this->contrasena_hash;
    }

    public function rol()
    {
        return $this->belongsTo(Rol::class);
    }

    public function esAdmin(): bool
    {
        return $this->rol->nombre === 'ADMIN';
    }

    // Así se devuelve el usuario en el JSON, como dice el contrato de la Entrega 2
    public function toArray()
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'email' => $this->correo,
            'rol' => $this->rol,
            'activo' => $this->activo,
            'creadoEn' => $this->creado_en,
        ];
    }
}
