<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Usuarios de prueba, uno por cada rol
        // firstOrCreate para que no se dupliquen cada vez que arranca el contenedor
        User::firstOrCreate(['email' => 'admin@ferreandina.com'], [
            'name' => 'Administrador',
            'password' => 'admin123',
            'rol' => 'ADMIN',
        ]);

        User::firstOrCreate(['email' => 'operador@ferreandina.com'], [
            'name' => 'Operador Bodega',
            'password' => 'operador123',
            'rol' => 'OPERADOR',
        ]);
    }
}
