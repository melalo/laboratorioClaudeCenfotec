import { describe, expect, it } from 'vitest'
import { buildGraph, computeNodeStatus } from './graph'
import { DAY_MS } from './srs'
import type { SkillNode, UserItemState } from './types'

/**
 * Reproduce el reporte real de un usuario:
 *
 * «Dejé la app un mes por un viaje. Volví esperando que me mandara a repasar
 * lo que ya tenía flojo, porque antes hacía eso. Pero el mapa me muestra todo
 * dominado, igual que como lo dejé. Se siente como si no se diera cuenta de
 * que pasó el tiempo.»
 *
 * Estas pruebas describen lo que el usuario esperaba ver en el mapa, no un
 * detalle interno de implementación.
 */

const T0 = 1_750_000_000_000
const ONE_MONTH_MS = 30 * DAY_MS

function mkNode(id: string, prerequisites: string[], items: string[]): SkillNode {
  return { id, name: id, description: '', tier: 0, prerequisites, tags: [], items }
}

/** Un ítem que justo alcanzó el umbral de dominio y ya venció sin repasarse. */
function mkJustMasteredButDueState(itemId: string): UserItemState {
  return {
    itemId,
    easiness: 2.5,
    interval: 6,
    repetitions: 3,
    mastery: 80,
    bestBpm: null,
    dueDate: T0,
    lastReviewed: T0 - 6 * DAY_MS,
  }
}

describe('reporte de usuario: el mapa no se da cuenta de que pasó el tiempo', () => {
  it('un nodo dominado que se dejó vencer un mes deja de mostrarse como dominado', () => {
    const node = mkNode('A', [], ['a1'])
    const graph = buildGraph([node])
    const states = new Map([['a1', mkJustMasteredButDueState('a1')]])

    // Al momento de vencer, el nodo está dominado: así lo dejó el usuario.
    expect(computeNodeStatus(graph, node, states, T0)).toBe('mastered')

    // Un mes después, sin practicar, el usuario espera que el mapa refleje
    // que ese conocimiento se oxidó — no que siga viéndolo "dominado".
    const afterAMonth = computeNodeStatus(graph, node, states, T0 + ONE_MONTH_MS)
    expect(afterAMonth).not.toBe('mastered')
  })

  it('un nodo oxidado vuelve a bloquear lo que dependía de él, como pide la premisa del producto', () => {
    const parent = mkNode('A', [], ['a1'])
    const child = mkNode('B', ['A'], ['b1'])
    const graph = buildGraph([parent, child])
    const states = new Map([['a1', mkJustMasteredButDueState('a1')]])

    // Con A recién dominado, B queda disponible para practicarse.
    expect(computeNodeStatus(graph, child, states, T0)).not.toBe('locked')

    // Un mes sin tocar A, el usuario espera volver a ver B bloqueado hasta
    // refrescar el prerequisito — no que siga disponible como si nada.
    const afterAMonth = computeNodeStatus(graph, child, states, T0 + ONE_MONTH_MS)
    expect(afterAMonth).toBe('locked')
  })
})
