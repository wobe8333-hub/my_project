'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

interface TodayResponse {
  dayPointer: number
  dayInWeek: number
  today: { workout: string; diet: string }
}

const GENERIC_ERROR = '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

export default function TodayPage() {
  const [data, setData] = useState<TodayResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/plan/today')
      .then(async (res) => {
        let json: { error?: string } & Partial<TodayResponse> = {}
        try {
          json = await res.json()
        } catch {
          setError(GENERIC_ERROR)
          return
        }
        if (!res.ok) {
          setError(json.error ?? GENERIC_ERROR)
        } else {
          setData(json as TodayResponse)
        }
      })
      .catch(() => setError(GENERIC_ERROR))
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

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
      <p>
        <a href="/history">진행 기록 보기</a> · <a href="/profile">프로필 수정</a> ·{' '}
        <button type="button" onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>
          로그아웃
        </button>
      </p>
    </main>
  )
}
