function calcularTotal(carrito) {
  let subtotal = 0;
  for (const item of carrito) {
    subtotal += item.precio * item.cantidad;
  }

  let descuento = 0;
  if (carrito.length > 10) {
    descuento = subtotal * 0.10;
  }

  const total = subtotal - descuento;
  return { subtotal, descuento, total };
}

module.exports = { calcularTotal };
