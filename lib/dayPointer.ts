const REGENERATE_GAP_DAYS = 3
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function shouldRegeneratePlan(lastProgressAt: Date | null, now: Date): boolean {
  if (!lastProgressAt) return false
  const gapDays = (now.getTime() - lastProgressAt.getTime()) / MS_PER_DAY
  return gapDays >= REGENERATE_GAP_DAYS
}

export function getCurrentWeekAndDay(dayPointer: number): {
  weekNumber: number
  dayInWeek: number
} {
  const weekNumber = Math.floor((dayPointer - 1) / 7) + 1
  const dayInWeek = ((dayPointer - 1) % 7) + 1
  return { weekNumber, dayInWeek }
}
