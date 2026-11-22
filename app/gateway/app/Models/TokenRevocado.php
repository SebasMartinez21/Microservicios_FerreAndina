<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TokenRevocado extends Model
{
    protected $table = 'tokens_revocados';
    public $timestamps = false;

    protected $fillable = ['usuario_id', 'jti', 'expira_en'];
}
