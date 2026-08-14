// La reserva temporal de asientos (vertical slice 2 del PLAN.md).
//
// Todo lo que decide si un asiento esta libre u ocupado vive aca, para que el servidor
// solo se ocupe de atender pedidos y armar pantallas.

import { calcularBoletos, generarCodigo } from './precios.js';
import { comoTextoInstante } from './semana.js';

// El plazo de la reserva temporal (DISENO.md, "Otras decisiones"). Bajo de 5 a 3 minutos
// al construir este slice: el pago es simulado y no pide datos de tarjeta.
export const MINUTOS_DE_RESERVA = 3;

// Los dos motivos por los que una reserva se puede rechazar. El servidor los traduce a
// un mensaje y a una respuesta distinta segun el caso.
export class ReservaRechazada extends Error {
  constructor(motivo) {
    super(motivo);
    this.motivo = motivo;
  }
}

// Lo mismo, para el pago (vertical slice 3).
export class PagoRechazado extends Error {
  constructor(motivo) {
    super(motivo);
    this.motivo = motivo;
  }
}

export function crearReservas(db) {
  const consultas = {
    // Marcar como vencidas las reservas que ya pasaron el plazo. Es lo que dice
    // "Manejo de errores" del DISENO.md: el estado queda escrito en la base.
    vencerPasadasDePlazo: db.prepare(`
      UPDATE compras SET estado = 'vencida'
       WHERE funcion_id = ? AND estado = 'reservada' AND creada_en <= ?`),

    // Los asientos que una funcion tiene tomados ahora mismo, con la compra que los tiene.
    // Son dos casos: una compra ya pagada, que no vence nunca, o una reserva que todavia
    // esta dentro del plazo. Una reserva pasada de plazo no cuenta, aunque todavia nadie
    // la haya marcado vencida: asi el asiento nunca queda bloqueado de mas.
    tomadosDeLaFuncion: db.prepare(`
      SELECT ca.asiento_id, ca.compra_id, c.estado
        FROM compras_asientos ca
        JOIN compras c ON c.id = ca.compra_id
       WHERE c.funcion_id = ?
         AND (c.estado = 'pagada' OR (c.estado = 'reservada' AND c.creada_en > ?))`),

    asientosDeSala: db.prepare(`
      SELECT id, fila, numero, fila || numero AS codigo
        FROM asientos WHERE sala_id = ? ORDER BY fila, numero`),

    crearCompra: db.prepare(`
      INSERT INTO compras (funcion_id, estado, creada_en)
      VALUES (?, 'reservada', ?) RETURNING id`),

    agregarAsiento: db.prepare('INSERT INTO compras_asientos (compra_id, asiento_id) VALUES (?, ?)'),

    // Reservar de nuevo en la misma funcion reemplaza la reserva anterior: se borra, y
    // los asientos que el cliente solto vuelven a estar libres (DISENO.md). No se guarda
    // como "vencida" porque nunca llego a ser una compra: solo quedaria basura en los
    // reportes del vertical slice 7.
    borrarCompra: db.prepare('DELETE FROM compras WHERE id = ? AND estado = \'reservada\''),

    // El plazo se calcula en la propia base: SQLite sabe sumarle minutos a una fecha
    // escrita como texto, y asi no hay que volver a convertirla a fecha en JavaScript.
    reservaPorId: db.prepare(`
      SELECT c.id, c.estado, c.creada_en,
             c.nombre, c.identificacion, c.estudiantes, c.total, c.codigo, c.metodo,
             datetime(c.creada_en, '+${MINUTOS_DE_RESERVA} minutes') AS vence,
             CAST((julianday(datetime(c.creada_en, '+${MINUTOS_DE_RESERVA} minutes'))
                   - julianday(?)) * 86400 AS INTEGER) AS segundos_restantes,
             f.id AS funcion_id, f.fecha_hora, f.formato,
             p.nombre AS pelicula, s.nombre AS sala
        FROM compras c
        JOIN funciones f ON f.id = c.funcion_id
        JOIN peliculas p ON p.id = f.pelicula_id
        JOIN salas s ON s.id = f.sala_id
       WHERE c.id = ?`),

    // Los boletos de una compra: el asiento, y —si ya se pago— su descuento y su precio.
    asientosDeCompra: db.prepare(`
      SELECT ca.asiento_id, a.fila || a.numero AS codigo, ca.descuento, ca.precio
        FROM compras_asientos ca JOIN asientos a ON a.id = ca.asiento_id
       WHERE ca.compra_id = ? ORDER BY a.fila, a.numero`),

    // --- El pago (vertical slice 3) ---

    // Lo minimo para decidir si esta compra se puede pagar, leido dentro de la
    // transaccion para que nada cambie entre la comprobacion y el cobro.
    compraParaPagar: db.prepare(`
      SELECT c.id, c.estado, c.creada_en, f.fecha_hora
        FROM compras c JOIN funciones f ON f.id = c.funcion_id
       WHERE c.id = ?`),

    ponerPrecioAlBoleto: db.prepare(`
      UPDATE compras_asientos SET descuento = ?, precio = ?
       WHERE compra_id = ? AND asiento_id = ?`),

    marcarPagada: db.prepare(`
      UPDATE compras
         SET estado = 'pagada', nombre = ?, identificacion = ?, estudiantes = ?,
             total = ?, codigo = ?, metodo = ?
       WHERE id = ? AND estado = 'reservada'`),

    compraPorCodigo: db.prepare('SELECT id FROM compras WHERE codigo = ?'),
  };

  // Un codigo de confirmacion que todavia no tenga nadie. La base ademas tiene un indice
  // unico, asi que si dos compras simultaneas sacaran el mismo, la segunda fallaria en
  // vez de pisar a la primera.
  function codigoLibre() {
    for (let intento = 0; intento < 20; intento++) {
      const codigo = generarCodigo();
      if (!consultas.compraPorCodigo.get(codigo)) return codigo;
    }
    throw new PagoRechazado('SIN_CODIGO_LIBRE');
  }

  // El instante a partir del cual una reserva sigue viva: todo lo creado antes vencio.
  function limiteDeVigencia(ahora) {
    return comoTextoInstante(new Date(ahora.getTime() - MINUTOS_DE_RESERVA * 60 * 1000));
  }

  return {
    // Se llama al mostrar el mapa: deja escrito en la base lo que el plazo ya decidio.
    vencerLasPasadasDePlazo(funcionId, ahora) {
      consultas.vencerPasadasDePlazo.run(funcionId, limiteDeVigencia(ahora));
    },

    // Que asiento tiene tomado cual compra, en esta funcion y en este momento, y si esa
    // compra esta reservada o ya pagada. El estado importa para el color: el amarillo es
    // "lo estas eligiendo", y una compra pagada ya no se elige (DISENO.md).
    ocupacionDe(funcionId, ahora) {
      const tomados = new Map();
      for (const fila of consultas.tomadosDeLaFuncion.all(funcionId, limiteDeVigencia(ahora))) {
        tomados.set(fila.asiento_id, { compraId: fila.compra_id, estado: fila.estado });
      }
      return tomados;
    },

    asientosDeSala(salaId) {
      return consultas.asientosDeSala.all(salaId);
    },

    // Toda la reserva ocurre dentro de una transaccion: SQLite trata el bloque como una
    // sola operacion indivisible, asi que entre comprobar que los asientos siguen libres
    // y guardarlos no se puede colar otro pedido (DISENO.md, "Otras decisiones"). Si algo
    // falla, se deshace entero: no queda media reserva.
    reservar({ funcionId, salaId, codigos, ahora, reservaPrevia = null }) {
      const instante = comoTextoInstante(ahora);
      const limite = limiteDeVigencia(ahora);
      const pedidos = [...new Set(codigos)];
      if (pedidos.length === 0) throw new ReservaRechazada('SIN_ASIENTOS');

      db.exec('BEGIN IMMEDIATE');
      try {
        consultas.vencerPasadasDePlazo.run(funcionId, limite);
        if (reservaPrevia) consultas.borrarCompra.run(reservaPrevia);

        const porCodigo = new Map(consultas.asientosDeSala.all(salaId).map((a) => [a.codigo, a.id]));
        const elegidos = pedidos.map((codigo) => {
          const id = porCodigo.get(codigo);
          if (!id) throw new ReservaRechazada('ASIENTO_DESCONOCIDO');
          return id;
        });

        const tomados = new Set(
          consultas.tomadosDeLaFuncion.all(funcionId, limite).map((t) => t.asiento_id),
        );
        if (elegidos.some((id) => tomados.has(id))) throw new ReservaRechazada('ASIENTO_TOMADO');

        const { id: compraId } = consultas.crearCompra.get(funcionId, instante);
        for (const asientoId of elegidos) consultas.agregarAsiento.run(compraId, asientoId);

        db.exec('COMMIT');
        return compraId;
      } catch (falla) {
        db.exec('ROLLBACK');
        throw falla;
      }
    },

    // La reserva —o la compra ya pagada— con todo lo que la pantalla necesita, o null si
    // esa compra no existe.
    reservaPorId(compraId, ahora) {
      const reserva = consultas.reservaPorId.get(comoTextoInstante(ahora), compraId);
      if (!reserva) return null;
      const boletos = consultas.asientosDeCompra.all(compraId);
      return {
        ...reserva,
        boletos,
        asientos: boletos.map((b) => b.codigo),
        pagada: reserva.estado === 'pagada',
        vigente: reserva.estado === 'reservada' && reserva.segundos_restantes > 0,
      };
    },

    // El pago simulado (RF-9): la compra pasa de "reservada" a "pagada" y recibe su
    // codigo de confirmacion, sin conectarse a ningun medio de pago real.
    //
    // Va entero dentro de una transaccion, igual que la reserva: entre comprobar que la
    // reserva sigue viva y cobrarla no se puede colar otro pedido. Sin eso, una reserva
    // que vence en ese instante podria pagarse igual, y el asiento quedaria vendido dos
    // veces (DISENO.md, "Otras decisiones").
    pagar({ compraId, nombre, identificacion, estudiantes, metodo, tarifas, ahora }) {
      const limite = limiteDeVigencia(ahora);

      db.exec('BEGIN IMMEDIATE');
      try {
        const compra = consultas.compraParaPagar.get(compraId);
        if (!compra) throw new PagoRechazado('NO_EXISTE');

        // Pagar dos veces la misma compra no la cobra dos veces: la primera ya la dejo
        // pagada, y volver a intentarlo simplemente no cambia nada.
        if (compra.estado === 'pagada') {
          db.exec('COMMIT');
          return { yaEstabaPagada: true };
        }

        if (compra.estado !== 'reservada' || compra.creada_en <= limite) {
          throw new PagoRechazado('RESERVA_VENCIDA');
        }

        const asientos = consultas.asientosDeCompra.all(compraId);
        if (estudiantes > asientos.length) throw new PagoRechazado('DEMASIADOS_ESTUDIANTES');

        const { boletos, total } = calcularBoletos({
          fechaHora: compra.fecha_hora,
          codigos: asientos.map((a) => a.codigo),
          estudiantes,
          tarifas,
        });

        // calcularBoletos devuelve los boletos en el mismo orden en que se le pasaron,
        // asi que la posicion alcanza para saber a que asiento corresponde cada precio.
        boletos.forEach((boleto, posicion) => {
          consultas.ponerPrecioAlBoleto.run(
            boleto.descuento,
            boleto.precio,
            compraId,
            asientos[posicion].asiento_id,
          );
        });

        const codigo = codigoLibre();
        consultas.marcarPagada.run(nombre, identificacion, estudiantes, total, codigo, metodo, compraId);

        db.exec('COMMIT');
        return { codigo, total, boletos };
      } catch (falla) {
        db.exec('ROLLBACK');
        throw falla;
      }
    },
  };
}
