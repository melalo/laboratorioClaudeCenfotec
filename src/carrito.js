function calcularTotal(carrito) {
  let subtotal = 0;
  for (const item of carrito) {
    subtotal += item.precio * item.cantidad;
  }

  let descuento = 0;
  for (const item of carrito) {
    if (item.cantidad > 10) {
      descuento += item.precio * item.cantidad * 0.10;
    }
  }

  const iva = (subtotal - descuento) * 0.13;
  const total = subtotal - descuento + iva;
  return { subtotal, descuento, iva, total };
}

module.exports = { calcularTotal };
