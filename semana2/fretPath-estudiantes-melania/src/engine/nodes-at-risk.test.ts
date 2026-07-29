import { describe, expect, it } from 'vitest'
import { buildGraph, computeNodeStatus, nodesAtRisk } from './graph'
import { DAY_MS, OVERDUE_RETENTION_PER_DAY, ITEM_MASTERY_TARGET } from './srs'
import type { SkillNode, UserItemState } from './types'

/**
 * `nodesAtRisk` es "lo que nunca se llegó a construir": el aviso anticipado
 * de oxidación. Cada prueba de este archivo fija una de las seis decisiones
 * de borde que la firma no resuelve (ver el comentario sobre `nodesAtRisk`
 * en graph.ts) y que se acordaron explícitamente antes de programar.
 */

const T0 = 1_750_000_000_000

function mkNode(id: string, prerequisites: string[], items: string[]): SkillNode {
  return { id, name: id, description: '', tier: 0, prerequisites, tags: [], items }
}

function mkState(itemId: string, overrides: Partial<UserItemState> = {}): UserItemState {
  return {
    itemId,
    easiness: 2.5,
    interval: 6,
    repetitions: 3,
    mastery: 90,
    bestBpm: null,
    dueDate: T0 + 6 * DAY_MS,
    lastReviewed: T0,
    ...overrides,
  }
}

describe('nodesAtRisk — decisión 1: alcanza con que UN ítem del nodo esté por caer', () => {
  it('marca el nodo en riesgo aunque el PROMEDIO de sus ítems se mantenga sobre el umbral', () => {
    const node = mkNode('A', [], ['a1', 'a2'])
    const graph = buildGraph([node])
    const states = new Map([
      // a1 nunca decae dentro de la ventana (vence muy lejos en el futuro).
      ['a1', mkState('a1', { mastery: 100, dueDate: T0 + 1000 * DAY_MS })],
      // a2 ya está vencido y en 2 días de atraso cae justo debajo del umbral.
      ['a2', mkState('a2', { mastery: 85, dueDate: T0 })],
    ])

    // Verificación de que el promedio NO cruza el umbral (para no confundir
    // esta prueba con la semántica descartada de "solo si el promedio cae").
    const decayedA2 = 85 * Math.pow(OVERDUE_RETENTION_PER_DAY, 2)
    expect((100 + decayedA2) / 2).toBeGreaterThan(ITEM_MASTERY_TARGET)

    expect(nodesAtRisk(graph, states, T0, 2).map((n) => n.id)).toEqual(['A'])
  })
})

describe('nodesAtRisk — decisiones 2 y 3: solo cuentan nodos HOY dominados', () => {
  it('un ítem nunca practicado deja su nodo afuera, sin importar el horizonte', () => {
    const node = mkNode('A', [], ['a1'])
    const graph = buildGraph([node])
    // Ítem nunca tocado: sin estado registrado (equivalente a mastery 0).
    const states = new Map<string, UserItemState>()

    expect(nodesAtRisk(graph, states, T0, 3650)).toEqual([])
  })

  it('un nodo que ya cayó (no dominado hoy) queda afuera, aunque siga bajando', () => {
    const node = mkNode('A', [], ['a1'])
    const graph = buildGraph([node])
    const states = new Map([['a1', mkState('a1', { mastery: 50, dueDate: T0 })]])

    expect(computeNodeStatus(graph, node, states, T0)).not.toBe('mastered')
    expect(nodesAtRisk(graph, states, T0, 30)).toEqual([])
  })
})

describe('nodesAtRisk — decisión 4: mantenimiento recibe el mismo trato', () => {
  it('un nodo en mantenimiento que se va a oxidar dentro del horizonte se reporta igual', () => {
    const node = mkNode('A', [], ['a1'])
    const graph = buildGraph([node])
    const states = new Map([
      ['a1', mkState('a1', { mastery: 85, interval: 30, dueDate: T0 })],
    ])

    expect(computeNodeStatus(graph, node, states, T0)).toBe('maintenance')
    expect(nodesAtRisk(graph, states, T0, 2).map((n) => n.id)).toEqual(['A'])
  })
})

describe('nodesAtRisk — decisión 5: un nodo sin ítems nunca puede estar en riesgo', () => {
  it('un nodo vacío no aparece en la lista, sin importar el horizonte', () => {
    const empty = mkNode('E', [], [])
    const graph = buildGraph([empty])

    expect(nodesAtRisk(graph, new Map(), T0, 3650)).toEqual([])
  })
})

describe('nodesAtRisk — decisión 6: el borde del horizonte es inclusivo', () => {
  it('un ítem que cruza el umbral EXACTAMENTE el día horizonDays cuenta como dentro', () => {
    const horizonDays = 1
    const dueDate = T0 + (horizonDays - 1) * DAY_MS // vence 1 día antes del final de la ventana

    // Construido para que, al final de la ventana, la maestría decaiga a
    // exactamente 80 (el umbral) — ni un punto más abajo.
    const masteryThatLandsExactlyOnTarget =
      ITEM_MASTERY_TARGET / OVERDUE_RETENTION_PER_DAY

    const node = mkNode('A', [], ['a1'])
    const graph = buildGraph([node])
    const states = new Map([
      ['a1', mkState('a1', { mastery: masteryThatLandsExactlyOnTarget, dueDate })],
    ])

    expect(nodesAtRisk(graph, states, T0, horizonDays).map((n) => n.id)).toEqual(['A'])
  })
})
