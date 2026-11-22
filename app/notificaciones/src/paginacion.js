// Lee ?pagina= y ?limite= con los valores por defecto del contrato (1 y 20, máximo 100)
function paginacion(query) {
  const pagina = Math.max(parseInt(query.pagina) || 1, 1);
  const limite = Math.min(Math.max(parseInt(query.limite) || 20, 1), 100);
  return { pagina, limite };
}

module.exports = { paginacion };
