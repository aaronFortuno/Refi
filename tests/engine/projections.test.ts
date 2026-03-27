import { describe, it, expect } from 'vitest'
import { resolveEuriborProjections, getEuriborPerMes } from '@/engine/projections'
import type { ProjectionEntry } from '@/types'

describe('resolveEuriborProjections', () => {
  it('retorna euríbor actual si no hi ha projeccions', () => {
    const result = resolveEuriborProjections([], 3.5, 2026, 2030)
    expect(result.get(2026)).toBe(3.5)
    expect(result.get(2030)).toBe(3.5)
  })

  it('aplica projeccions explícites', () => {
    const projections: ProjectionEntry[] = [
      { any: 2026, euribor: 3.0 },
      { any: 2027, euribor: 2.5 },
    ]
    const result = resolveEuriborProjections(projections, 3.5, 2026, 2028)
    expect(result.get(2026)).toBe(3.0)
    expect(result.get(2027)).toBe(2.5)
    expect(result.get(2028)).toBe(2.5) // Hereta de 2027
  })

  it('hereta el valor anterior quan euribor és null', () => {
    const projections: ProjectionEntry[] = [
      { any: 2026, euribor: 3.0 },
      { any: 2027, euribor: null },
      { any: 2028, euribor: 2.0 },
    ]
    const result = resolveEuriborProjections(projections, 3.5, 2026, 2030)
    expect(result.get(2026)).toBe(3.0)
    expect(result.get(2027)).toBe(3.0) // Hereta de 2026
    expect(result.get(2028)).toBe(2.0)
    expect(result.get(2029)).toBe(2.0) // Hereta de 2028
    expect(result.get(2030)).toBe(2.0)
  })

  it('usa euríbor actual com a fallback per anys sense projecció', () => {
    const projections: ProjectionEntry[] = [
      { any: 2028, euribor: 2.0 },
    ]
    const result = resolveEuriborProjections(projections, 3.5, 2026, 2030)
    expect(result.get(2026)).toBe(3.5) // Fallback a actual
    expect(result.get(2027)).toBe(3.5) // Segueix amb actual
    expect(result.get(2028)).toBe(2.0) // Projecció explícita
    expect(result.get(2029)).toBe(2.0) // Hereta
  })

  it('cobreix tot el rang any per any', () => {
    const result = resolveEuriborProjections([], 3.5, 2026, 2030)
    expect(result.size).toBe(5) // 2026, 2027, 2028, 2029, 2030
  })
})

describe('getEuriborPerMes', () => {
  it('retorna euríbor actual + diferencial abans de la revisió', () => {
    const tin = getEuriborPerMes(
      1,
      3.5,
      0.8,
      '2027-06-01',
      [],
      new Date('2026-01-01')
    )
    expect(tin).toBe(4.3) // 3.5 + 0.8
  })

  it('usa projecció corresponent després de la revisió', () => {
    const projections: ProjectionEntry[] = [
      { any: 2027, euribor: 2.5 },
    ]
    // Mes 19 des de gener 2026 = juliol 2027 (després de revisió juny 2027)
    const tin = getEuriborPerMes(
      19,
      3.5,
      0.8,
      '2027-06-01',
      projections,
      new Date('2026-01-01')
    )
    expect(tin).toBe(3.3) // 2.5 + 0.8
  })

  it('retorna euríbor actual + diferencial si no hi ha data de revisió', () => {
    const tin = getEuriborPerMes(
      100,
      3.5,
      0.8,
      undefined,
      [{ any: 2028, euribor: 1.0 }],
      new Date('2026-01-01')
    )
    expect(tin).toBe(4.3) // Sempre usa actual
  })
})
