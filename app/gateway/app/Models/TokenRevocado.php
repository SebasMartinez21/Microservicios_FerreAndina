<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TokenRevocado extends Model
{
    protected $table = 'tokens_revocados';
    protected $primaryKey = 'jti';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = ['jti', 'expira_en'];
}
