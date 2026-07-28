'use client'

import { useEffect, useMemo, useState } from 'react'
import { Flame, CalendarCheck } from 'lucide-react'
import TopTabs from '@/app/components/TopTabs'

interface HistoryResponse {
  completedDays: { day_pointer: number; completed_at: string }[]
  currentDayPointer: number
  daysSinceSignup: number
}

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function computeStreak(completedDates: Set<string>): number {
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  while (completedDates.has(toLocalDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null)

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then(setData)
  }, [])

  const completedDateSet = useMemo(() => {
    if (!data) return new Set<string>()
    return new Set(data.completedDays.map((d) => toLocalDateKey(new Date(d.completed_at))))
  }, [data])

  const streak = useMemo(() => computeStreak(completedDateSet), [completedDateSet])

  const calendarCells = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: { day: number | null; done: boolean }[] = []
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, done: false })
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toLocalDateKey(new Date(year, month, d))
      cells.push({ day: d, done: completedDateSet.has(key) })
    }
    return cells
  }, [completedDateSet])

  if (!data) {
    return (
      <>
        <TopTabs />
        <main className="page"><p className="text-secondary">불러오는 중...</p></main>
      </>
    )
  }

  const completionRate = Math.min(
    100,
    Math.round((data.completedDays.length / data.daysSinceSignup) * 100)
  )

  return (
    <>
      <TopTabs />
      <main className="page">
        <h1 className="page-title">진행 기록</h1>

        <div className="history-grid">
          <div className="stack">
            <div className="card">
              <span className="card-title">현재 {data.currentDayPointer}일차 진행 중</span>
              <div className="row">
                <div className="donut" style={{ '--pct': completionRate } as React.CSSProperties}>
                  <div className="donut-inner">{completionRate}%</div>
                </div>
                <div className="stat-row" style={{ flex: 1 }}>
                  <div className="stat-card">
                    <Flame size={18} color="var(--text-secondary)" />
                    <span className="stat-card-value">{streak}</span>
                    <span className="stat-card-label">연속 일수</span>
                  </div>
                  <div className="stat-card">
                    <CalendarCheck size={18} color="var(--text-secondary)" />
                    <span className="stat-card-value">{data.completedDays.length}</span>
                    <span className="stat-card-label">총 완료</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="post-card">
              <div className="post-card-header">
                <span className="post-card-label">이번 달</span>
              </div>
              <div className="post-card-body">
                <div className="calendar-grid">
                  {calendarCells.map((cell, i) =>
                    cell.day === null ? (
                      <div key={i} className="calendar-cell calendar-cell-empty" />
                    ) : (
                      <div key={i} className={`calendar-cell${cell.done ? ' calendar-cell-done' : ''}`}>
                        {cell.day}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          <ul className="list">
            {data.completedDays
              .slice()
              .reverse()
              .map((d) => (
                <li className="list-item" key={d.day_pointer}>
                  {d.day_pointer}일차 완료 — {new Date(d.completed_at).toLocaleDateString('ko-KR')}
                </li>
              ))}
          </ul>
        </div>
      </main>
    </>
  )
}
