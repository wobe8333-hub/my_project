const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface WeekStripDay {
  dayPointer: number
  isoDate: string
  weekdayLabel: string
  isToday: boolean
}

export function computeWeekStripDays(
  dayPointer: number,
  dayInWeek: number,
  today: Date
): WeekStripDay[] {
  const baseUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const days: WeekStripDay[] = []

  for (let i = 1; i <= 7; i++) {
    const offset = i - dayInWeek
    const date = new Date(baseUTC + offset * MS_PER_DAY)
    days.push({
      dayPointer: dayPointer - dayInWeek + i,
      isoDate: date.toISOString().slice(0, 10),
      weekdayLabel: WEEKDAY_LABELS[date.getUTCDay()],
      isToday: offset === 0,
    })
  }

  return days
}
