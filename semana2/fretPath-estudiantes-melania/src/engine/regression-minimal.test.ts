import { describe, expect, it } from 'vitest'
import { isNodeMastered } from './graph'
import { DAY_MS } from './srs'
import type { SkillNode, UserItemState } from './types'

/**
 * Reto adicional: el conjunto mínimo de pruebas que habría atrapado el bug
 * original. Es UNA sola prueba, con una única diferencia respecto al patrón
 * que ya usaba graph.test.ts: preguntarle a `isNodeMastered` por un `now`
 * posterior al `dueDate` del ítem. Ninguna prueba original lo hacía — ver
 * BITACORA.md — así que esta única prueba habría bastado para atraparlo.
 */

const T0 = 1_750_000_000_000

function mkNode(id: string, items: string[]): SkillNode {
  return { id, name: id, description: '', tier: 0, prerequisites: [], tags: [], items }
}

describe('reto adicional — la prueba mínima que habría atrapado el bug', () => {
  it('un ítem justo en el umbral deja de contar como dominado tras un mes sin practicarlo', () => {
    const node = mkNode('T', ['t1'])
    const state: UserItemState = {
      itemId: 't1',
      easiness: 2.5,
      interval: 6,
      repetitions: 3,
      mastery: 80,
      bestBpm: null,
      dueDate: T0,
      lastReviewed: T0 - 6 * DAY_MS,
    }
    const states = new Map([['t1', state]])

    // Mismo dato, dos preguntas en dos "ahoras" distintos.
    expect(isNodeMastered(node, states, T0)).toBe(true)
    expect(isNodeMastered(node, states, T0 + 30 * DAY_MS)).toBe(false)
  })
})
