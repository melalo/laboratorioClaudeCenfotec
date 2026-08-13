// Las contrasenas del personal no se guardan legibles: se guarda el resultado de
// pasarlas por scrypt, que es de ida y no de vuelta (DISENO.md, "Otras decisiones").
// scrypt viene incluido en Node.js, asi que esto no agrega ninguna dependencia.

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const LARGO = 64;

export function cifrar(contrasena) {
  const sal = randomBytes(16).toString('hex');
  return { sal, cifrada: scryptSync(contrasena, sal, LARGO).toString('hex') };
}

export function coincide(contrasena, sal, cifrada) {
  const intento = scryptSync(contrasena, sal, LARGO);
  const guardada = Buffer.from(cifrada, 'hex');
  if (intento.length !== guardada.length) return false;
  return timingSafeEqual(intento, guardada);
}
