'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'
import TopTabs from '@/app/components/TopTabs'
import WeekStrip from '@/app/components/WeekStrip'
import { computeWeekStripDays } from '@/lib/weekStrip'

interface WeekPlanResponse {
  dayPointer: number
  dayInWeek: number
  days: { dayPointer: number; workout: string; diet: string; completed: boolean }[]
}

const GENERIC_ERROR = '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

export default function TodayPage() {
  const [data, setData] = useState<WeekPlanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedIndex, setCompletedIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  async function loadWeek(options?: { keepSelection?: boolean }) {
    try {
      const res = await fetch('/api/plan/week')
      let json: { error?: string } & Partial<WeekPlanResponse> = {}
      try {
        json = await res.json()
      } catch {
        setError(GENERIC_ERROR)
        return
      }
      if (!res.ok) {
        setError(json.error ?? GENERIC_ERROR)
      } else {
        const weekData = json as WeekPlanResponse
        setData(weekData)
        if (!options?.keepSelection) {
          setSelectedIndex(weekData.dayInWeek - 1)
        }
      }
    } catch {
      setError(GENERIC_ERROR)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWeek()
  }, [])

  const stripDays = useMemo(() => {
    if (!data) return []
    const computed = computeWeekStripDays(data.dayPointer, data.dayInWeek, new Date())
    return computed.map((d, i) => ({
      ...d,
      completed: data.days[i]?.completed ?? false,
      isFuture: i > data.dayInWeek - 1,
    }))
  }, [data])

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <>
        <main className="page"><p className="text-secondary">불러오는 중...</p></main>
        <TopTabs />
      </>
    )
  }
  if (error) {
    return (
      <>
        <main className="page">
          <p className="text-error">{error}</p>
          <a className="text-link" href="/profile">프로필 입력하러 가기</a>
        </main>
        <TopTabs />
      </>
    )
  }
  if (!data) return null

  const selectedDay = data.days[selectedIndex]
  const isToday = selectedIndex === data.dayInWeek - 1
  const isJustCompleted = selectedIndex === completedIndex

  return (
    <>
      <main className="page">
        <div className="row">
          <h1 className="page-title">오늘</h1>
          <span className="badge">{data.dayPointer}일차</span>
        </div>

        <WeekStrip days={stripDays} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />

        <div className="post-card">
          <div className="post-card-header">
            <span className="post-card-icon">🏋️</span>
            <span className="post-card-label">운동</span>
          </div>
          <p className="post-card-body">{selectedDay.workout}</p>
        </div>

        <div className="post-card">
          <div className="post-card-header">
            <span className="post-card-icon">🥗</span>
            <span className="post-card-label">식단</span>
          </div>
          <p className="post-card-body">{selectedDay.diet}</p>
        </div>

        {isJustCompleted && <p className="text-secondary">오늘 완료 처리되었습니다. 수고하셨습니다!</p>}

        {isToday && !isJustCompleted && (
          <button
            className="btn btn-primary"
            onClick={async () => {
              const res = await fetch('/api/plan/complete', { method: 'POST' })
              if (res.ok) {
                setCompletedIndex(selectedIndex)
                await loadWeek({ keepSelection: true })
              }
            }}
          >
            오늘 완료
          </button>
        )}

        <div className="row">
          <button type="button" className="btn-text" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </main>
      <TopTabs />
    </>
  )
}
