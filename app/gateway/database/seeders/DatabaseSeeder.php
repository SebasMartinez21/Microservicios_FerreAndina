<?php

namespace Database\Seeders;

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    // Se usa firstOrCreate para que no se dupliquen cada vez que arranca el contenedor
    public function run(): void
    {
        $admin = Rol::firstOrCreate(['nombre' => 'ADMIN'], [
            'descripcion' => 'Administra usuarios, bodegas, proveedores y configuración.',
        ]);

        $operador = Rol::firstOrCreate(['nombre' => 'OPERADOR'], [
            'descripcion' => 'Registra movimientos y consulta el inventario de su bodega.',
        ]);

        Usuario::firstOrCreate(['correo' => 'admin@ferreandina.com'], [
            'nombre' => 'Administrador',
            'contrasena' => 'admin1234',
            'rol_id' => $admin->id,
        ]);

        Usuario::firstOrCreate(['correo' => 'operador@ferreandina.com'], [
            'nombre' => 'Operador Bodega',
            'contrasena' => 'operador1234',
            'rol_id' => $operador->id,
        ]);
    }
}
