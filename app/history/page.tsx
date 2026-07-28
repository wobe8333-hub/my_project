'use client'

import { useEffect, useState } from 'react'
import TopTabs from '@/app/components/TopTabs'

interface HistoryResponse {
  completedDays: { day_pointer: number; completed_at: string }[]
  currentDayPointer: number
  daysSinceSignup: number
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null)

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then(setData)
  }, [])

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

        <div className="card">
          <span className="card-title">현재 {data.currentDayPointer}일차 진행 중</span>
          <span className="card-body">완료율 {completionRate}%</span>
        </div>

        <ul className="list">
          {data.completedDays.map((d) => (
            <li className="list-item" key={d.day_pointer}>
              {d.day_pointer}일차 완료 — {new Date(d.completed_at).toLocaleDateString('ko-KR')}
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
