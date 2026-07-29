import { describe, expect, it } from 'vitest'
import {
  buildGraph,
  computeNodeStatus,
  isNodeWeakened,
  weakenedPrereqs,
} from './graph'
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

/**
 * `isNodeWeakened` y `weakenedPrereqs` implementan la otra mitad de "lo que
 * se oxidó vuelve a pedir trabajo": «Al abrir un nodo bloqueado, el mapa
 * indica qué prerequisitos hay que volver a practicar». Ninguna de las 105
 * pruebas originales ejercitaba estas dos funciones — quedaron sin cobertura
 * desde antes del bug que se corrigió. Como dependen de `isNodeMastered`,
 * conviene volver a recorrerlas ahora que esa corrección ya está aplicada.
 */
describe('cobertura faltante: aviso de prerequisito oxidado', () => {
  it('un nodo recién dominado, sin vencer, no se considera oxidado', () => {
    const node = mkNode('A', [], ['a1'])
    const states = new Map([['a1', mkJustMasteredButDueState('a1')]])
    expect(isNodeWeakened(node, states, T0)).toBe(false)
  })

  it('un nodo que ganó su dominio pero luego se dejó vencer se marca oxidado', () => {
    const node = mkNode('A', [], ['a1'])
    const states = new Map([['a1', mkJustMasteredButDueState('a1')]])
    expect(isNodeWeakened(node, states, T0 + ONE_MONTH_MS)).toBe(true)
  })

  it('al abrir un nodo bloqueado, señala cuál de sus prerequisitos hay que repasar', () => {
    const parent = mkNode('A', [], ['a1'])
    const child = mkNode('B', ['A'], ['b1'])
    const graph = buildGraph([parent, child])
    const states = new Map([['a1', mkJustMasteredButDueState('a1')]])

    expect(weakenedPrereqs(graph, 'B', states, T0)).toEqual([])
    expect(weakenedPrereqs(graph, 'B', states, T0 + ONE_MONTH_MS)).toEqual([parent])
  })

  it('con dos prerequisitos oxidados, el aviso muestra solo uno (límite de espacio del panel, documentado en el código)', () => {
    const parentA = mkNode('A', [], ['a1'])
    const parentC = mkNode('C', [], ['c1'])
    const child = mkNode('D', ['A', 'C'], ['d1'])
    const graph = buildGraph([parentA, parentC, child])
    const states = new Map([
      ['a1', mkJustMasteredButDueState('a1')],
      ['c1', mkJustMasteredButDueState('c1')],
    ])

    const warned = weakenedPrereqs(graph, 'D', states, T0 + ONE_MONTH_MS)
    expect(warned).toHaveLength(1)
  })
})

describe('cobertura faltante: mantenimiento también se oxida con el tiempo', () => {
  it('un nodo en mantenimiento deja de contar como dominado si se abandona lo suficiente', () => {
    const node = mkNode('A', [], ['a1'])
    const graph = buildGraph([node])
    const longInterval = 30
    const state: UserItemState = {
      itemId: 'a1',
      easiness: 2.5,
      interval: longInterval,
      repetitions: 5,
      mastery: 80,
      bestBpm: null,
      dueDate: T0,
      lastReviewed: T0 - longInterval * DAY_MS,
    }
    const states = new Map([['a1', state]])

    expect(computeNodeStatus(graph, node, states, T0)).toBe('maintenance')
    expect(computeNodeStatus(graph, node, states, T0 + ONE_MONTH_MS)).not.toBe(
      'maintenance',
    )
  })
})
