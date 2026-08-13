// La semana del cine va de jueves a miercoles, porque los estrenos entran los jueves
// (ESPECIFICACION.md, glosario "Cartelera"; DISENO.md, "Otras decisiones").
// Como el miercoles es el ultimo dia, toda semana vigente contiene exactamente un
// miercoles: el dia del descuento de RN-2.

const JUEVES = 4; // getDay(): 0 = domingo, 1 = lunes, ... 4 = jueves

// Las fechas se manejan como texto 'AAAA-MM-DD' y 'AAAA-MM-DD HH:MM'. Escrito asi,
// comparar dos fechas es comparar dos textos, y el orden alfabetico coincide con el
// orden cronologico. Eso evita lios de zonas horarias.
export function comoTextoFecha(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function comoTextoFechaHora(fecha) {
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${comoTextoFecha(fecha)} ${hora}:${minutos}`;
}

// Los 7 dias de la semana vigente, del jueves al miercoles.
export function diasDeLaSemana(hoy = new Date()) {
  const diasDesdeElJueves = (hoy.getDay() + 7 - JUEVES) % 7;
  const jueves = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diasDesdeElJueves);
  return Array.from({ length: 7 }, (_, i) =>
    comoTextoFecha(new Date(jueves.getFullYear(), jueves.getMonth(), jueves.getDate() + i)),
  );
}

export function semanaVigente(hoy = new Date()) {
  const dias = diasDeLaSemana(hoy);
  return { inicio: dias[0], fin: dias[6] };
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre',
];

// '2026-08-19 20:00' -> 'miércoles 19 de agosto, 20:00'
export function fechaLegible(fechaHora) {
  const [fecha, hora] = fechaHora.split(' ');
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const nombreDelDia = DIAS[new Date(anio, mes - 1, dia).getDay()];
  return `${nombreDelDia} ${dia} de ${MESES[mes - 1]}, ${hora}`;
}
