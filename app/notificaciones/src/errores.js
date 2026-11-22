// Error con código HTTP. Se lanza desde cualquier parte y el manejador de index.js
// lo convierte en la respuesta { codigo, mensaje }.
class ErrorHttp extends Error {
  constructor(estado, codigo, mensaje) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

module.exports = { ErrorHttp };
