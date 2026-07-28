import { describe, it, expect } from 'vitest'
import { computeWeekStripDays } from './weekStrip'

describe('computeWeekStripDays', () => {
  it('오늘을 기준으로 7일치 dayPointer/날짜/오늘여부를 계산한다', () => {
    const today = new Date(2026, 6, 28) // 2026-07-28, dayInWeek 3 가정
    const result = computeWeekStripDays(12, 3, today)

    expect(result).toHaveLength(7)
    expect(result[2]).toMatchObject({ dayPointer: 12, isoDate: '2026-07-28', isToday: true })
    expect(result[0]).toMatchObject({ dayPointer: 10, isoDate: '2026-07-26', isToday: false })
    expect(result[6]).toMatchObject({ dayPointer: 16, isoDate: '2026-08-01', isToday: false })
  })

  it('dayInWeek이 1이면 오늘이 스트립의 첫번째 칸이다', () => {
    const today = new Date(2026, 6, 28)
    const result = computeWeekStripDays(20, 1, today)
    expect(result[0]).toMatchObject({ dayPointer: 20, isoDate: '2026-07-28', isToday: true })
    expect(result[0].isToday).toBe(true)
    expect(result.filter((d) => d.isToday)).toHaveLength(1)
  })

  it('각 칸의 weekdayLabel은 실제 날짜의 요일과 일치한다', () => {
    const today = new Date(2026, 6, 28)
    const result = computeWeekStripDays(12, 3, today)
    const expectedLabels = ['일', '월', '화', '수', '목', '금', '토']
    result.forEach((day) => {
      const [y, m, d] = day.isoDate.split('-').map(Number)
      const expected = expectedLabels[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
      expect(day.weekdayLabel).toBe(expected)
    })
  })
})
