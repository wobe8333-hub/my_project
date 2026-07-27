'use client'

import { useEffect, useState } from 'react'

interface TodayResponse {
  dayPointer: number
  dayInWeek: number
  today: { workout: string; diet: string }
}

export default function TodayPage() {
  const [data, setData] = useState<TodayResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/plan/today')
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) {
          setError(json.error)
        } else {
          setData(json)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <main style={{ padding: 24 }}>불러오는 중...</main>
  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <p>{error}</p>
        <a href="/profile">프로필 입력하러 가기</a>
      </main>
    )
  }
  if (!data) return null

  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1>오늘 ({data.dayPointer}일차)</h1>
      <section>
        <h2>오늘의 운동</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{data.today.workout}</p>
      </section>
      <section>
        <h2>오늘의 식단</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{data.today.diet}</p>
      </section>
      {done ? (
        <p>오늘 완료 처리되었습니다. 수고하셨습니다!</p>
      ) : (
        <button
          onClick={async () => {
            const res = await fetch('/api/plan/complete', { method: 'POST' })
            if (res.ok) setDone(true)
          }}
        >
          오늘 완료
        </button>
      )}
      <p><a href="/history">진행 기록 보기</a> · <a href="/profile">프로필 수정</a></p>
    </main>
  )
}
