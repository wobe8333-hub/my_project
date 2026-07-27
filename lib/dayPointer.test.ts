import { describe, it, expect } from 'vitest'
import { shouldRegeneratePlan, getCurrentWeekAndDay } from './dayPointer'

describe('shouldRegeneratePlan', () => {
  it('마지막 진행일이 없으면 재생성하지 않는다(최초 생성 케이스)', () => {
    expect(shouldRegeneratePlan(null, new Date('2026-07-27'))).toBe(false)
  })

  it('3일 미만 공백이면 재생성하지 않는다', () => {
    const last = new Date('2026-07-25T00:00:00Z')
    const now = new Date('2026-07-27T00:00:00Z')
    expect(shouldRegeneratePlan(last, now)).toBe(false)
  })

  it('3일 이상 공백이면 재생성한다', () => {
    const last = new Date('2026-07-20T00:00:00Z')
    const now = new Date('2026-07-27T00:00:00Z')
    expect(shouldRegeneratePlan(last, now)).toBe(true)
  })
})

describe('getCurrentWeekAndDay', () => {
  it('day_pointer 1은 1주차 1일차다', () => {
    expect(getCurrentWeekAndDay(1)).toEqual({ weekNumber: 1, dayInWeek: 1 })
  })

  it('day_pointer 8은 2주차 1일차다', () => {
    expect(getCurrentWeekAndDay(8)).toEqual({ weekNumber: 2, dayInWeek: 1 })
  })

  it('day_pointer 14는 2주차 7일차다', () => {
    expect(getCurrentWeekAndDay(14)).toEqual({ weekNumber: 2, dayInWeek: 7 })
  })
})
