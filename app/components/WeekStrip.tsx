'use client'

interface WeekStripDayView {
  dayPointer: number
  isoDate: string
  weekdayLabel: string
  isToday: boolean
  completed: boolean
  isFuture: boolean
}

interface WeekStripProps {
  days: WeekStripDayView[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export default function WeekStrip({ days, selectedIndex, onSelect }: WeekStripProps) {
  return (
    <div className="week-strip">
      {days.map((day, i) => (
        <button
          key={day.dayPointer}
          type="button"
          className={`week-strip-day${day.isToday ? ' week-strip-day-today' : ''}${
            i === selectedIndex ? ' week-strip-day-selected' : ''
          }${day.isFuture ? ' week-strip-day-future' : ''}`}
          onClick={() => onSelect(i)}
        >
          <span className="week-strip-weekday">{day.weekdayLabel}</span>
          <span className="week-strip-date">{Number(day.isoDate.slice(8, 10))}</span>
          {day.completed && <span className="week-strip-check">✓</span>}
        </button>
      ))}
    </div>
  )
}
