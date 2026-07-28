'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, Salad, Camera, Undo2, LogOut } from 'lucide-react'
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

function Checklist({ text, hasTitle }: { text: string; hasTitle?: boolean }) {
  const lines = useMemo(() => text.split('\n').map((l) => l.trim()).filter(Boolean), [text])
  const [checked, setChecked] = useState<Set<number>>(new Set())

  if (lines.length <= 1) {
    return <p className="post-card-body">{text}</p>
  }

  const title = hasTitle ? lines[0] : null
  const items = hasTitle ? lines.slice(1) : lines

  return (
    <div className="post-card-body checklist">
      {title && <p className="checklist-title">{title}</p>}
      {items.map((line, i) => (
        <label key={i} className={`checklist-item${checked.has(i) ? ' checklist-item-done' : ''}`}>
          <input
            type="checkbox"
            checked={checked.has(i)}
            onChange={(e) => {
              setChecked((prev) => {
                const next = new Set(prev)
                if (e.target.checked) next.add(i)
                else next.delete(i)
                return next
              })
            }}
          />
          <span>{line}</span>
        </label>
      ))}
    </div>
  )
}

export default function TodayPage() {
  const [data, setData] = useState<WeekPlanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedIndex, setCompletedIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
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

  async function handleComplete() {
    setUploading(true)
    try {
      let photoUrl: string | undefined
      if (photoFile && data) {
        const supabase = createBrowserSupabase()
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
          const path = `${userData.user.id}/${data.dayPointer}-${Date.now()}.jpg`
          const { error: uploadError } = await supabase.storage
            .from('workout-photos')
            .upload(path, photoFile, { contentType: photoFile.type })
          if (!uploadError) {
            const { data: publicUrl } = supabase.storage.from('workout-photos').getPublicUrl(path)
            photoUrl = publicUrl.publicUrl
          }
        }
      }

      const res = await fetch('/api/plan/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
      })
      if (res.ok) {
        setCompletedIndex(selectedIndex)
        setPhotoFile(null)
        setPhotoPreview(null)
        await loadWeek({ keepSelection: true })
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleUndo() {
    const res = await fetch('/api/plan/complete', { method: 'DELETE' })
    if (res.ok) {
      setCompletedIndex(null)
      await loadWeek({ keepSelection: true })
    }
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
  const isJustCompleted = selectedIndex === completedIndex || (isToday && selectedDay.completed)

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
            <span className="post-card-icon"><Dumbbell size={16} color="#fff" /></span>
            <span className="post-card-label">운동</span>
          </div>
          <Checklist text={selectedDay.workout} hasTitle />
        </div>

        <div className="post-card">
          <div className="post-card-header">
            <span className="post-card-icon"><Salad size={16} color="#fff" /></span>
            <span className="post-card-label">식단</span>
          </div>
          <Checklist text={selectedDay.diet} />
        </div>

        {isToday && !isJustCompleted && (
          <div className="post-card">
            <div className="post-card-header">
              <span className="post-card-label">운동 인증샷 (선택)</span>
            </div>
            <div className="photo-attach">
              {photoPreview && <img className="photo-attach-preview" src={photoPreview} alt="운동 인증샷 미리보기" />}
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                <Camera size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                사진 선택
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setPhotoFile(file)
                    setPhotoPreview(URL.createObjectURL(file))
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {isJustCompleted && (
          <div className="row">
            <p className="text-secondary">오늘 완료 처리되었습니다. 수고하셨습니다!</p>
            <button className="btn-text" type="button" onClick={handleUndo}>
              <Undo2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
              완료 취소
            </button>
          </div>
        )}

        {isToday && !isJustCompleted && (
          <button className="btn btn-primary" onClick={handleComplete} disabled={uploading}>
            {uploading ? '업로드 중...' : '오늘 완료'}
          </button>
        )}

        <div className="row">
          <button type="button" className="btn-text" onClick={handleLogout}>
            <LogOut size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
            로그아웃
          </button>
        </div>
      </main>
      <TopTabs />
    </>
  )
}
