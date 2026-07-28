import { describe, it, expect } from 'vitest'
import { computeWorkoutDayFlags } from './workoutSchedule'

describe('computeWorkoutDayFlags', () => {
  it('주 3회면 정확히 3일만 운동일이다', () => {
    const flags = computeWorkoutDayFlags(3)
    expect(flags.filter(Boolean)).toHaveLength(3)
  })

  it('연속 운동일을 만들지 않는다 (weeklyDays <= 4)', () => {
    const flags = computeWorkoutDayFlags(3)
    for (let i = 0; i < flags.length - 1; i++) {
      expect(flags[i] && flags[i + 1]).toBe(false)
    }
  })

  it('weeklyDays가 7이면 전부 운동일이다', () => {
    const flags = computeWorkoutDayFlags(7)
    expect(flags.every(Boolean)).toBe(true)
  })

  it('weeklyDays가 0이면 전부 휴식일이다', () => {
    const flags = computeWorkoutDayFlags(0)
    expect(flags.some(Boolean)).toBe(false)
  })

  it('weeklyDays가 1이면 정확히 1일만 운동일이다', () => {
    const flags = computeWorkoutDayFlags(1)
    expect(flags.filter(Boolean)).toHaveLength(1)
  })

  it('weeklyDays가 totalDays보다 크면 totalDays로 clamp한다', () => {
    const flags = computeWorkoutDayFlags(10)
    expect(flags.filter(Boolean)).toHaveLength(7)
  })
})
