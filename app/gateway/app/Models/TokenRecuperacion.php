<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TokenRecuperacion extends Model
{
    protected $table = 'tokens_recuperacion';
    public $timestamps = false;

    protected $fillable = ['usuario_id', 'token_hash', 'expira_en', 'usado_en'];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class);
    }
}
