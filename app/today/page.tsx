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

  if (loading) return <main className="page"><p className="text-secondary">불러오는 중...</p></main>
  if (error) {
    return (
      <main className="page">
        <p className="text-error">{error}</p>
        <a className="text-link" href="/profile">프로필 입력하러 가기</a>
      </main>
    )
  }
  if (!data) return null

  return (
    <main className="page">
      <div className="row">
        <h1 className="page-title">오늘</h1>
        <span className="badge">{data.dayPointer}일차</span>
      </div>

      <div className="card">
        <span className="card-title">오늘의 운동</span>
        <p className="card-body">{data.today.workout}</p>
      </div>

      <div className="card">
        <span className="card-title">오늘의 식단</span>
        <p className="card-body">{data.today.diet}</p>
      </div>

      {done ? (
        <p className="text-secondary">오늘 완료 처리되었습니다. 수고하셨습니다!</p>
      ) : (
        <button
          className="btn btn-primary"
          onClick={async () => {
            const res = await fetch('/api/plan/complete', { method: 'POST' })
            if (res.ok) setDone(true)
          }}
        >
          오늘 완료
        </button>
      )}

      <div className="row">
        <p className="text-secondary">
          <a className="text-link" href="/history">진행 기록</a> · <a className="text-link" href="/profile">프로필 수정</a>
        </p>
        <button type="button" className="btn-text" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </main>
  )
}
