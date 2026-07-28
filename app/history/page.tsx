'use client'

import { useEffect, useState } from 'react'

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

  if (!data) return <main style={{ padding: 24 }}>불러오는 중...</main>

  const completionRate = Math.min(
    100,
    Math.round((data.completedDays.length / data.daysSinceSignup) * 100)
  )

  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1>진행 기록</h1>
      <p>현재 {data.currentDayPointer}일차 진행 중 (완료율 {completionRate}%)</p>
      <ul>
        {data.completedDays.map((d) => (
          <li key={d.day_pointer}>
            {d.day_pointer}일차 완료 — {new Date(d.completed_at).toLocaleDateString('ko-KR')}
          </li>
        ))}
      </ul>
      <p><a href="/today">오늘로 돌아가기</a></p>
    </main>
  )
}
