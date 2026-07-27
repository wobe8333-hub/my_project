import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lookupGymEquipment } from './gymEquipment'

describe('lookupGymEquipment', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('검색이 차단되면 빈 배열을 반환한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 }) as any
    const result = await lookupGymEquipment('테스트 헬스장')
    expect(result).toEqual([])
  })
})
