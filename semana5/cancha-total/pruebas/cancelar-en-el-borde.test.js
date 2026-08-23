'use strict';

// El borde exacto de las 24 horas — condición E-22 de ESPECIFICACION.md
//
// Nivel: es el borde de una regla, o sea **unidad** por naturaleza; forzada a integración por
// H-11, igual que el resto.
//
// **El reloj queda clavado el martes 25 de agosto de 2026 a las 20:00.** Con esa hora, el bloque
// de las 20:00 del día siguiente cae a exactamente 24 horas, y el de las 19:00 a 23 horas. Los dos
// son bloques reales del día de alquiler, que va de 8:00 a 21:00: por eso este archivo usa un
// reloj distinto del de `cancelar-a-tiempo.test.js`.
//
// El borde es donde vive la diferencia entre lo que el código hace y lo que el negocio quiere, así
// que se prueba con su número exacto y por sus dos lados.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const s = require('./servidor-de-pruebas');

const AHORA = '2026-08-25T20:00:00';

before(s.levantarLaAplicacionConReloj(AHORA));
after(s.bajarLaAplicacion);

test('P-42 · con exactamente 24 horas de aviso, todavía se puede cancelar', async () => {
  // El plazo es "hasta 24 horas antes", y se decidió a favor del cliente: si faltan 24 horas
  // justas, todavía alcanza. Falla si el borde se vuelve estricto y le come el derecho a quien
  // avisó justo en el límite.
  const numero = s.sembrarReserva({
    cancha: 1, fecha: '2026-08-26', hora: 20, cliente: 'Justo en el borde',
    telefono: '88112233', precio: 20000,
  });

  await s.cancelar(numero);
  assert.equal(s.leerReserva(numero).estado, 'cancelada');
});

test(
  'P-43 · con 23 horas de aviso, una hora menos que el plazo, no se puede cancelar',
  async () => {
    // El otro lado del mismo borde. Falla mientras la regla compare solo días: hoy el sistema lo
    // cancela porque el partido es "de mañana", sin fijarse en que faltan 23 horas.
    const numero = s.sembrarReserva({
      cancha: 2, fecha: '2026-08-26', hora: 19, cliente: 'Una hora tarde',
      telefono: '88112233', precio: 20000,
    });

    await s.cancelar(numero);
    assert.equal(s.leerReserva(numero).estado, 'activa');
  }
);
