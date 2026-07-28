# 인스타그램 스타일 리디자인 + 주간 스트립 캘린더 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오늘 페이지에 "이번 사이클 7일" 스트립 캘린더를 추가하고, 앱 전체 톤앤매너를 인스타그램 느낌(포스트형 카드, 하단 아이콘 탭바, 그라데이션 포인트)으로 리스타일한다.

**Architecture:** `plan/today` 라우트의 플랜 조회/생성 로직을 `lib/weekPlan.ts`로 추출해 신규 `GET /api/plan/week`와 공유한다. 오늘 페이지는 `/api/plan/week`로 7일치를 받아 상단 스트립(날짜 계산은 순수 함수 `lib/weekStrip.ts`)과 선택된 날짜의 운동/식단 카드를 렌더링한다. 하단 탭바는 기존 상단 고정 텍스트 탭을 하단 고정 아이콘 탭으로 교체한다. 스타일은 `globals.css`에 신규 클래스 추가로만 처리하고 기존 `.card`/`.btn` 등은 그대로 둔다(다른 페이지 영향 없음).

**Tech Stack:** Next.js (App Router), React 19, vitest, Supabase.

## Global Constraints

- 다크 테마 유지, 라이트 모드 전환 없음 ([globals.css](../../../app/globals.css) `color-scheme: dark`).
- 캘린더는 "이번 사이클 7일"만 표시. 다음 사이클 데이터는 DB에 없으므로 표시하지 않음.
- 스트립의 요일/날짜는 실제 오늘 날짜 기준으로 계산 (`dayInWeek`은 월~일 고정 아님).
- 프로필/로그인/회원가입 페이지는 구조 변경 없음 — CSS만 상속.
- 신규 npm 패키지 추가 없음 (아이콘은 인라인 SVG).
- 커밋은 한국어 커밋 메시지, 기존 스타일(`fix:`, `feat:`, `style:` 접두사) 따름.

---

### Task 1: 주간 스트립 날짜 계산 순수 함수

**Files:**
- Create: `lib/weekStrip.ts`
- Test: `lib/weekStrip.test.ts`

**Interfaces:**
- Produces: `computeWeekStripDays(dayPointer: number, dayInWeek: number, today: Date): WeekStripDay[]` where `WeekStripDay = { dayPointer: number; isoDate: string; weekdayLabel: string; isToday: boolean }`. Task 4, 5가 이 타입과 함수를 사용함.

- [ ] **Step 1: Write the failing test**

`lib/weekStrip.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeWeekStripDays } from './weekStrip'

describe('computeWeekStripDays', () => {
  it('오늘을 기준으로 7일치 dayPointer/날짜/오늘여부를 계산한다', () => {
    const today = new Date(2026, 6, 28) // 2026-07-28, dayInWeek 3 가정
    const result = computeWeekStripDays(12, 3, today)

    expect(result).toHaveLength(7)
    expect(result[2]).toMatchObject({ dayPointer: 12, isoDate: '2026-07-28', isToday: true })
    expect(result[0]).toMatchObject({ dayPointer: 10, isoDate: '2026-07-26', isToday: false })
    expect(result[6]).toMatchObject({ dayPointer: 16, isoDate: '2026-08-01', isToday: false })
  })

  it('dayInWeek이 1이면 오늘이 스트립의 첫번째 칸이다', () => {
    const today = new Date(2026, 6, 28)
    const result = computeWeekStripDays(20, 1, today)
    expect(result[0]).toMatchObject({ dayPointer: 20, isoDate: '2026-07-28', isToday: true })
    expect(result[0].isToday).toBe(true)
    expect(result.filter((d) => d.isToday)).toHaveLength(1)
  })

  it('각 칸의 weekdayLabel은 실제 날짜의 요일과 일치한다', () => {
    const today = new Date(2026, 6, 28)
    const result = computeWeekStripDays(12, 3, today)
    const expectedLabels = ['일', '월', '화', '수', '목', '금', '토']
    result.forEach((day) => {
      const [y, m, d] = day.isoDate.split('-').map(Number)
      const expected = expectedLabels[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
      expect(day.weekdayLabel).toBe(expected)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/weekStrip.test.ts`
Expected: FAIL — `Cannot find module './weekStrip'`

- [ ] **Step 3: Write minimal implementation**

`lib/weekStrip.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/weekStrip.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/weekStrip.ts lib/weekStrip.test.ts
git commit -m "feat: 주간 스트립 날짜 계산 순수 함수 추가"
```

---

### Task 2: 플랜 조회/생성 로직을 lib/weekPlan.ts로 추출

**Files:**
- Create: `lib/weekPlan.ts`
- Modify: `app/api/plan/today/route.ts`

**Interfaces:**
- Consumes: `getProfile` ([lib/profile.ts](../../../lib/profile.ts)), `generateWeeklyPlan`/`WeeklyPlan` ([lib/planGenerator.ts](../../../lib/planGenerator.ts)), `shouldRegeneratePlan`/`getCurrentWeekAndDay` ([lib/dayPointer.ts](../../../lib/dayPointer.ts)).
- Produces: `getOrCreateWeeklyPlan(supabase, userId): Promise<{ dayPointer: number; dayInWeek: number; plan: WeeklyPlan }>`, `ProfileMissingError` (Error subclass). Task 3, 4가 이 함수와 에러 클래스를 사용함.

이 태스크는 기존 `plan/today` 라우트의 동작을 100% 보존하는 리팩터링이다. 새 자동화 테스트는 추가하지 않는다(기존 코드베이스도 Supabase 의존 라우트는 단위 테스트하지 않는 패턴 — [lib/dayPointer.test.ts](../../../lib/dayPointer.test.ts), [lib/planGenerator.test.ts](../../../lib/planGenerator.test.ts) 참고, 둘 다 순수 로직/네트워크만 테스트). 대신 회귀 여부는 기존 vitest 스위트 전체 통과 + Task 8의 브라우저 수동 확인으로 검증한다.

- [ ] **Step 1: `lib/weekPlan.ts` 작성 (기존 로직 그대로 이동)**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { getProfile } from './profile'
import { generateWeeklyPlan, type WeeklyPlan } from './planGenerator'
import { shouldRegeneratePlan, getCurrentWeekAndDay } from './dayPointer'

export class ProfileMissingError extends Error {}

export interface WeeklyPlanResult {
  dayPointer: number
  dayInWeek: number
  plan: WeeklyPlan
}

export async function getOrCreateWeeklyPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<WeeklyPlanResult> {
  const profile = await getProfile(supabase, userId)
  if (!profile) {
    throw new ProfileMissingError('프로필을 먼저 입력해주세요')
  }

  const { data: equipmentRow } = await supabase
    .from('gym_equipment')
    .select('equipment')
    .eq('user_id', userId)
    .maybeSingle()

  const now = new Date()
  const lastProgressAt = profile.last_progress_at ? new Date(profile.last_progress_at) : null
  const needsRegeneration = shouldRegeneratePlan(lastProgressAt, now)

  const weekAnchorPointer = profile.week_anchor_pointer ?? 1
  // A gap-triggered regeneration restarts the week-numbering cycle from today,
  // without touching the cumulative day_pointer itself.
  const effectiveAnchor = needsRegeneration ? profile.day_pointer : weekAnchorPointer

  const { weekNumber, dayInWeek } = getCurrentWeekAndDay(profile.day_pointer, effectiveAnchor)

  const { data: existingPlan } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_anchor_pointer', effectiveAnchor)
    .eq('week_number', weekNumber)
    .maybeSingle()

  let plan = existingPlan?.plan as WeeklyPlan | undefined

  if (!plan || needsRegeneration) {
    let adherenceNote: string | undefined
    if (needsRegeneration) {
      const { count } = await supabase
        .from('daily_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      adherenceNote = `총 ${count ?? 0}일 완료함, 최근 3일 이상 공백 발생`
    } else if (weekNumber > 1) {
      const prevWeekStart = effectiveAnchor + (weekNumber - 2) * 7
      const prevWeekEnd = effectiveAnchor + (weekNumber - 1) * 7 - 1
      const { count } = await supabase
        .from('daily_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('day_pointer', prevWeekStart)
        .lte('day_pointer', prevWeekEnd)
      adherenceNote = `지난주 7일 중 ${count ?? 0}일 완료함`
    }

    const generated = await generateWeeklyPlan(
      {
        heightCm: profile.height_cm,
        weightKg: profile.weight_kg,
        age: profile.age,
        gender: profile.gender,
        experienceLevel: profile.experience_level,
        weeklyDays: profile.weekly_days,
        sessionMinutes: profile.session_minutes,
        goal: profile.goal ?? undefined,
        environment: profile.environment,
        allergies: profile.allergies ?? [],
      },
      equipmentRow?.equipment ?? [],
      adherenceNote
    )

    const { error: upsertError } = await supabase.from('weekly_plans').upsert(
      {
        user_id: userId,
        week_anchor_pointer: effectiveAnchor,
        week_number: weekNumber,
        plan: generated,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_anchor_pointer,week_number' }
    )
    if (upsertError) {
      throw new Error('주간 계획 저장에 실패했습니다: ' + upsertError.message)
    }

    if (needsRegeneration) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          last_progress_at: now.toISOString(),
          week_anchor_pointer: profile.day_pointer,
        })
        .eq('user_id', userId)
      if (profileUpdateError) {
        throw new Error('프로필 갱신에 실패했습니다: ' + profileUpdateError.message)
      }
    }

    plan = generated
  }

  return { dayPointer: profile.day_pointer, dayInWeek, plan }
}
```

- [ ] **Step 2: `app/api/plan/today/route.ts`를 `getOrCreateWeeklyPlan` 사용하도록 교체**

```ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getOrCreateWeeklyPlan, ProfileMissingError } from '@/lib/weekPlan'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  const userId = userData.user.id

  try {
    const { dayPointer, dayInWeek, plan } = await getOrCreateWeeklyPlan(supabase, userId)
    return NextResponse.json({
      dayPointer,
      dayInWeek,
      today: plan.days[dayInWeek - 1],
    })
  } catch (err) {
    if (err instanceof ProfileMissingError) {
      return NextResponse.json({ error: err.message, needsProfile: true }, { status: 400 })
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
```

- [ ] **Step 3: 기존 테스트 스위트 회귀 확인**

Run: `npm run test`
Expected: 기존 모든 테스트 PASS (동작 변경 없는 순수 리팩터링이므로 실패하면 안 됨)

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 5: Commit**

```bash
git add lib/weekPlan.ts app/api/plan/today/route.ts
git commit -m "refactor: 주간 플랜 조회/생성 로직을 lib/weekPlan.ts로 추출"
```

---

### Task 3: `GET /api/plan/week` 엔드포인트

**Files:**
- Create: `app/api/plan/week/route.ts`

**Interfaces:**
- Consumes: `getOrCreateWeeklyPlan`, `ProfileMissingError` (Task 2).
- Produces: HTTP `GET /api/plan/week` → `{ dayPointer: number; dayInWeek: number; days: { dayPointer: number; workout: string; diet: string; completed: boolean }[] }`. Task 4가 이 응답 형식을 소비함.

- [ ] **Step 1: 라우트 작성**

```ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getOrCreateWeeklyPlan, ProfileMissingError } from '@/lib/weekPlan'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  const userId = userData.user.id

  try {
    const { dayPointer, dayInWeek, plan } = await getOrCreateWeeklyPlan(supabase, userId)

    const weekStartPointer = dayPointer - dayInWeek + 1
    const weekEndPointer = weekStartPointer + 6

    const { data: progress, error: progressError } = await supabase
      .from('daily_progress')
      .select('day_pointer')
      .eq('user_id', userId)
      .gte('day_pointer', weekStartPointer)
      .lte('day_pointer', weekEndPointer)

    if (progressError) {
      throw new Error('완료 기록 조회에 실패했습니다: ' + progressError.message)
    }

    const completedPointers = new Set((progress ?? []).map((p) => p.day_pointer))

    const days = plan.days.map((d, i) => ({
      dayPointer: weekStartPointer + i,
      workout: d.workout,
      diet: d.diet,
      completed: completedPointers.has(weekStartPointer + i),
    }))

    return NextResponse.json({ dayPointer, dayInWeek, days })
  } catch (err) {
    if (err instanceof ProfileMissingError) {
      return NextResponse.json({ error: err.message, needsProfile: true }, { status: 400 })
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add app/api/plan/week/route.ts
git commit -m "feat: 이번 사이클 7일치 플랜을 반환하는 /api/plan/week 추가"
```

---

### Task 4: WeekStrip 컴포넌트

**Files:**
- Create: `app/components/WeekStrip.tsx`

**Interfaces:**
- Consumes: `WeekStripDay` 타입 (Task 1) 확장 — `{ ...WeekStripDay; completed: boolean }`.
- Produces: `<WeekStrip days={...} selectedIndex={...} onSelect={(i) => void} />` React 컴포넌트. Task 5(오늘 페이지)가 사용함.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
'use client'

interface WeekStripDayView {
  dayPointer: number
  isoDate: string
  weekdayLabel: string
  isToday: boolean
  completed: boolean
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
          }`}
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
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (아직 CSS 클래스 미정의라도 TS 에러는 없음 — CSS는 Task 6에서 추가)

- [ ] **Step 3: Commit**

```bash
git add app/components/WeekStrip.tsx
git commit -m "feat: 주간 스트립 캘린더 컴포넌트 추가"
```

---

### Task 5: 오늘 페이지에 주간 스트립 통합

**Files:**
- Modify: `app/today/page.tsx`

**Interfaces:**
- Consumes: `GET /api/plan/week` 응답 (Task 3), `computeWeekStripDays` (Task 1), `<WeekStrip>` (Task 4).

- [ ] **Step 1: `app/today/page.tsx` 전체 교체**

```tsx
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
  const [done, setDone] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/plan/week')
      .then(async (res) => {
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
          setSelectedIndex(weekData.dayInWeek - 1)
        }
      })
      .catch(() => setError(GENERIC_ERROR))
      .finally(() => setLoading(false))
  }, [])

  const stripDays = useMemo(() => {
    if (!data) return []
    const computed = computeWeekStripDays(data.dayPointer, data.dayInWeek, new Date())
    return computed.map((d, i) => ({ ...d, completed: data.days[i]?.completed ?? false }))
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

        {isToday &&
          (done ? (
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
          ))}

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
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add app/today/page.tsx
git commit -m "feat: 오늘 페이지에 주간 스트립과 포스트형 카드 적용"
```

---

### Task 6: 하단 아이콘 탭바로 전환

**Files:**
- Modify: `app/components/TopTabs.tsx`

**Interfaces:**
- 없음 (독립 컴포넌트, 기존과 동일하게 `<TopTabs />`로 사용).

- [ ] **Step 1: `app/components/TopTabs.tsx` 전체 교체**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/today',
    label: '오늘',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: '/history',
    label: '기록',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: '프로필',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
]

export default function TopTabs() {
  const pathname = usePathname()

  return (
    <nav className="bottom-tabs">
      <div className="bottom-tabs-inner">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`bottom-tab${pathname === tab.href ? ' bottom-tab-active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add app/components/TopTabs.tsx
git commit -m "style: 하단 고정 아이콘 탭바로 전환"
```

---

### Task 7: 전역 스타일 — 그라데이션 포인트, 포스트 카드, 하단 탭바, 스트립

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: `:root`에 그라데이션 변수 추가**

`:root` 블록의 `--danger: #ff5b5b;` 다음 줄에 추가:

```css
  --gradient-accent: linear-gradient(135deg, #8b5cf6, #ec4899, #f97316);
```

- [ ] **Step 2: 상단 탭바 CSS를 하단 탭바 CSS로 교체**

`/* Top tabs */` 섹션 전체(`.top-tabs`, `.top-tabs-inner`, `.top-tab`, `.top-tab-active`)를 삭제하고 아래로 교체:

```css
/* Bottom tabs */

.bottom-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-tabs-inner {
  display: flex;
  width: 100%;
  max-width: 480px;
}

.bottom-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

.bottom-tab svg {
  width: 24px;
  height: 24px;
}

.bottom-tab-active {
  color: var(--text);
}

.bottom-tab-active span {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

- [ ] **Step 3: `.page` 하단 여백을 탭바 높이에 맞게 조정**

`.page` 규칙의 `padding: 32px 20px 80px;`을 다음으로 교체:

```css
  padding: 32px 20px 96px;
```

- [ ] **Step 4: 포스트형 카드 CSS 추가**

파일 끝(`.badge` 규칙 이후)에 추가:

```css
/* Post card (Instagram-style) */

.post-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.post-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.post-card-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-accent);
  font-size: 16px;
  flex-shrink: 0;
}

.post-card-label {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.post-card-body {
  padding: 18px;
  font-size: 16px;
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--text);
}

/* Week strip */

.week-strip {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.week-strip-day {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  position: relative;
}

.week-strip-date {
  font-size: 14px;
  font-weight: 700;
}

.week-strip-day-selected {
  border-color: var(--primary);
  color: var(--text);
}

.week-strip-day-today {
  border: 2px solid transparent;
  background-image: linear-gradient(var(--surface), var(--surface)), var(--gradient-accent);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  color: var(--text);
}

.week-strip-check {
  position: absolute;
  top: -6px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--gradient-accent);
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 5: `.badge`에 그라데이션 적용**

기존 `.badge` 규칙의 `background: var(--surface-2);`와 `color: var(--primary);` 두 줄을 다음으로 교체:

```css
  background: var(--gradient-accent);
  color: #fff;
```

- [ ] **Step 6: 빌드로 CSS 파싱 오류 없는지 확인**

Run: `npm run build`
Expected: 빌드 성공 (CSS 문법 오류 없음). Supabase 환경변수 미설정으로 인한 런타임 오류는 무시하고 컴파일 단계 통과만 확인.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css
git commit -m "style: 그라데이션 포인트, 포스트 카드, 하단 탭바, 주간 스트립 스타일 추가"
```

---

### Task 8: 브라우저 수동 검증

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 개발 서버 실행 후 로그인 상태로 `/today` 접속**

`npm run dev` 실행 후 브라우저로 로그인 → `/today` 이동.

- [ ] **Step 2: 주간 스트립 확인**

7칸이 보이는지, 오늘 칸이 그라데이션 테두리로 강조되는지, 완료된 날짜에 체크 표시가 뜨는지 확인.

- [ ] **Step 3: 스트립 날짜 탭 전환 확인**

다른 날짜 칸을 탭했을 때 아래 운동/식단 카드 내용이 바뀌는지, "오늘 완료" 버튼이 오늘이 아닌 날짜에서는 숨겨지는지 확인.

- [ ] **Step 4: 하단 탭바 확인**

화면 하단에 아이콘 탭바가 고정되어 있는지, `/history`·`/profile` 이동 시에도 하단에 유지되는지, 활성 탭 라벨에 그라데이션이 적용되는지 확인.

- [ ] **Step 5: 다크 테마 가독성 확인**

포스트 카드, 배지, 스트립의 그라데이션이 다크 배경에서 텍스트/아이콘 대비가 충분히 보이는지 스크린샷으로 확인.

- [ ] **Step 6: 콘솔/네트워크 에러 확인**

브라우저 콘솔에 에러가 없는지, `/api/plan/week` 요청이 200으로 응답하는지 확인.

문제 발견 시 해당 Task로 돌아가 수정 후 재확인.

---

## 스펙 커버리지 체크

- 캘린더(이번 사이클 7일, 실제 날짜 기준, 오늘 페이지 상단 통합, 탭 전환) → Task 1, 3, 4, 5
- 포스트형 카드 리스타일 → Task 5, 7
- 하단 아이콘 탭바 → Task 6, 7
- 그라데이션 포인트/여백/폰트 톤앤매너 → Task 7
- 프로필/로그인/회원가입 구조 변경 없음 → 별도 태스크 없음(CSS만 전역 상속, 의도된 범위)
