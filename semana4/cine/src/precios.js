// El precio de los boletos (vertical slice 3 del PLAN.md).
//
// RN-1: todas las funciones valen lo mismo. RN-2: los miercoles, la mitad. RN-3: 30%
// menos para estudiantes. RN-4: si los dos descuentos le tocan al mismo boleto, se
// aplica solo el mayor, sin sumarse.
//
// El precio base y los dos porcentajes viven en config.json, no aca: cambiarlos es
// editar un archivo de texto, no tocar esta regla (DISENO.md, "Otras decisiones").

import { randomInt } from 'node:crypto';

// Los tres valores que puede tener el descuento de un boleto.
export const SIN_DESCUENTO = 'ninguno';
export const POR_MIERCOLES = 'miercoles';
export const POR_ESTUDIANTE = 'estudiante';

const MIERCOLES = 3; // getDay(): 0 = domingo, 1 = lunes, 2 = martes, 3 = miercoles

// Las tarifas tal como las lee la aplicacion. Se pasan como dato a quien calcula, para
// que las comprobaciones puedan probar con otro precio sin tocar config.json.
export function tarifasDe(configuracion) {
  return {
    precioBase: configuracion.precioBase,
    descuentoMiercoles: configuracion.descuentoMiercoles,
    descuentoEstudiante: configuracion.descuentoEstudiante,
  };
}

// '2026-08-19 20:00' -> true. La fecha se arma en partes en vez de dejarsela a
// new Date(texto), que segun el navegador o la maquina la interpreta en otra zona
// horaria y puede correr el dia.
export function esMiercoles(fechaHora) {
  const [anio, mes, dia] = fechaHora.slice(0, 10).split('-').map(Number);
  return new Date(anio, mes - 1, dia).getDay() === MIERCOLES;
}

// Se redondea al colon entero: en Costa Rica no circulan centimos (DISENO.md).
function conDescuento(precioBase, porcentaje) {
  return Math.round((precioBase * (100 - porcentaje)) / 100);
}

// Que paga cada boleto de una compra. Devuelve un renglon por asiento, en el mismo
// orden en que llegaron, con el descuento que se le aplico y su precio.
export function calcularBoletos({ fechaHora, codigos, estudiantes, tarifas }) {
  const miercoles = esMiercoles(fechaHora);

  // Primero el precio que le toca a cada boleto sin mirar todavia lo del estudiante:
  // el descuento de miercoles es de la funcion, asi que alcanza a todos por igual.
  const boletos = codigos.map((codigo) => ({
    codigo,
    descuento: miercoles ? POR_MIERCOLES : SIN_DESCUENTO,
    precio: miercoles ? conDescuento(tarifas.precioBase, tarifas.descuentoMiercoles) : tarifas.precioBase,
  }));

  // El descuento de estudiante va a los boletos mas caros primero (DISENO.md). Hoy
  // todos valen lo mismo, asi que no cambia ningun total; se fija igual para que el
  // resultado no dependa del orden en que la base devuelva los asientos.
  const masCarosPrimero = [...boletos.keys()].sort((a, b) => boletos[b].precio - boletos[a].precio);
  const precioDeEstudiante = conDescuento(tarifas.precioBase, tarifas.descuentoEstudiante);

  for (const posicion of masCarosPrimero.slice(0, estudiantes)) {
    // RN-4: solo el mayor de los dos descuentos. Un miercoles el boleto ya esta a la
    // mitad, que es menos que el 70% del estudiante, asi que se queda como esta.
    if (precioDeEstudiante < boletos[posicion].precio) {
      boletos[posicion].descuento = POR_ESTUDIANTE;
      boletos[posicion].precio = precioDeEstudiante;
    }
  }

  return { boletos, total: boletos.reduce((suma, boleto) => suma + boleto.precio, 0) };
}

// Cuanto paga un boleto de cada tipo en esta funcion, ya con RN-4 resuelto: un miercoles
// los dos tipos dan el mismo precio, porque la mitad le gana al 30% del estudiante. Es lo
// que la tabla de la pantalla de pago muestra en su columna "Precio".
export function preciosPorTipo({ fechaHora, tarifas }) {
  const unBoleto = (estudiantes) =>
    calcularBoletos({ fechaHora, codigos: ['-'], estudiantes, tarifas }).boletos[0];
  return { regular: unBoleto(0), estudiante: unBoleto(1) };
}

// 4000 -> '₡4.000'. Un punto cada tres digitos, contando desde la derecha.
export function enColones(monto) {
  const digitos = String(monto);
  let conPuntos = '';
  for (let i = 0; i < digitos.length; i++) {
    if (i > 0 && (digitos.length - i) % 3 === 0) conPuntos += '.';
    conPuntos += digitos[i];
  }
  return `₡${conPuntos}`;
}

// El alfabeto del codigo de confirmacion: las 26 letras sin la O, la I ni la S, y los
// digitos sin el 0, el 1 ni el 5, que son los que se confunden al dictarlos por
// telefono. Quedan 30 caracteres (DISENO.md, "Que forma tiene el codigo").
const ALFABETO = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
const LARGO_DEL_CODIGO = 6;

// 'CV-7K3M9Q'. randomInt viene de node:crypto: da numeros al azar de verdad, no una
// secuencia que se pueda adivinar sabiendo la anterior.
export function generarCodigo() {
  let sufijo = '';
  for (let i = 0; i < LARGO_DEL_CODIGO; i++) sufijo += ALFABETO[randomInt(ALFABETO.length)];
  return `CV-${sufijo}`;
}
