import { describe, it, expect, vi } from 'vitest'
import { upsertProfile } from './profile'

describe('upsertProfile', () => {
  it('필수 필드가 없으면 에러를 던진다', async () => {
    const fakeSupabase = { from: vi.fn() } as any
    await expect(
      upsertProfile(fakeSupabase, 'user-1', {} as any)
    ).rejects.toThrow('필수 입력값이 누락되었습니다')
  })
})
