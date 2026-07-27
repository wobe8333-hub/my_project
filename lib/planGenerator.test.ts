import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateWeeklyPlan } from './planGenerator'

const fakeProfile = {
  heightCm: 175,
  weightKg: 70,
  age: 30,
  gender: 'male' as const,
  experienceLevel: 'beginner' as const,
  weeklyDays: 3,
  sessionMinutes: 60,
  goal: 'cut' as const,
  environment: 'home' as const,
  allergies: [],
}

describe('generateWeeklyPlan', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('7일치 계획을 반환한다', async () => {
    const days = Array.from({ length: 7 }, (_, i) => ({
      workout: `운동 ${i + 1}`,
      diet: `식단 ${i + 1}`,
    }))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ days }) } }],
      }),
    }) as any

    const result = await generateWeeklyPlan(fakeProfile, [])
    expect(result.days).toHaveLength(7)
    expect(result.days[0].workout).toBe('운동 1')
  })

  it('API 키가 없으면 에러를 던진다', async () => {
    delete process.env.OPENROUTER_API_KEY
    await expect(generateWeeklyPlan(fakeProfile, [])).rejects.toThrow(
      'OPENROUTER_API_KEY'
    )
  })

  it('응답이 7일치가 아니면 에러를 던진다', async () => {
    const days = Array.from({ length: 5 }, (_, i) => ({
      workout: `운동 ${i + 1}`,
      diet: `식단 ${i + 1}`,
    }))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ days }) } }],
      }),
    }) as any

    await expect(generateWeeklyPlan(fakeProfile, [])).rejects.toThrow(
      '7일치'
    )
  })

  it('OpenRouter 요청이 실패하면 에러를 던진다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as any

    await expect(generateWeeklyPlan(fakeProfile, [])).rejects.toThrow(
      'OpenRouter'
    )
  })

  it('응답 content가 없으면 에러를 던진다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: {} }] }),
    }) as any

    await expect(generateWeeklyPlan(fakeProfile, [])).rejects.toThrow()
  })

  it('응답 content가 JSON이 아니면 파싱 에러를 던진다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '죄송합니다, 계획을 생성할 수 없습니다.' } }],
      }),
    }) as any

    await expect(generateWeeklyPlan(fakeProfile, [])).rejects.toThrow(
      'AI 응답을 파싱할 수 없습니다.'
    )
  })
})
