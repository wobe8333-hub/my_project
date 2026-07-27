import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeInbodyPhoto } from './inbodyOcr'

describe('analyzeInbodyPhoto', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('AI 응답을 파싱해 숫자를 반환한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: '{"bodyFatPct": 18.5, "muscleMassKg": 32.1}' } },
        ],
      }),
    }) as any

    const result = await analyzeInbodyPhoto('data:image/png;base64,AAA')
    expect(result).toEqual({ bodyFatPct: 18.5, muscleMassKg: 32.1 })
  })

  it('숫자를 못 읽으면 null을 반환한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"bodyFatPct": null, "muscleMassKg": null}' } }],
      }),
    }) as any

    const result = await analyzeInbodyPhoto('data:image/png;base64,AAA')
    expect(result).toEqual({ bodyFatPct: null, muscleMassKg: null })
  })
})
