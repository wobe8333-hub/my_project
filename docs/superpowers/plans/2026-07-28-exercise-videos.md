# 운동기구 사용법 영상 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 헬스 운동기구 사용법 유튜브 영상을 카테고리별로 보여주는 새 탭(`/videos`) 추가.

**Architecture:** 공용 Supabase 테이블 `exercise_videos` → `/api/videos` GET route가 카테고리별로 그룹핑해 반환 → `app/videos/page.tsx`가 `app/history/page.tsx`와 동일한 client-fetch 패턴으로 렌더. 유튜브 URL → video id 추출은 순수 함수로 분리해 vitest 단위 테스트.

**Tech Stack:** Next.js (App Router), Supabase (`@supabase/ssr`), vitest.

## Global Constraints

- 코드 내 실제 개인정보/실데이터 금지 — 예시 데이터는 더미만 사용 (CLAUDE.md)
- 비밀 키는 `.env`로만 참조, 코드에 하드코딩 금지 (CLAUDE.md)
- 하드코딩 데이터 금지, Supabase에서 조회하는 방식으로 구현 (CLAUDE.md 데이터 규칙 7)
- `exercise_videos` 초기 데이터는 비워둠 — 화면/API만 구현, 실제 영상 데이터는 나중에 Supabase 콘솔에서 채움 (spec)
- RLS: `authenticated` role 전체 select만 허용, insert/update/delete 정책 없음 (spec)

---

### Task 1: DB 마이그레이션 — `exercise_videos` 테이블

**Files:**
- Create: `supabase/migrations/0004_exercise_videos.sql`

**Interfaces:**
- Produces: 테이블 `exercise_videos(id uuid, category text, name text, youtube_url text, sort_order integer, created_at timestamptz)`. 이후 태스크는 이 컬럼명을 그대로 select에 사용.

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
create table exercise_videos (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  youtube_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table exercise_videos enable row level security;

create policy "로그인 사용자 전체 조회"
  on exercise_videos for select
  using (auth.role() = 'authenticated');
```

- [ ] **Step 2: 로컬 Supabase에 적용 확인 (또는 원격 프로젝트에 적용)**

Run: `supabase db push` (로컬 스택 사용 중이면 `supabase migration up`)
Expected: `exercise_videos` 테이블 생성, 에러 없음. Supabase MCP 사용 가능하면 `list_tables`로 생성 확인.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_exercise_videos.sql
git commit -m "feat: exercise_videos 테이블 추가"
```

---

### Task 2: 유튜브 video id 추출 유틸 + 단위 테스트

**Files:**
- Create: `lib/youtube.ts`
- Test: `lib/youtube.test.ts`

**Interfaces:**
- Produces: `export function extractYoutubeId(url: string): string | null`
- Consumes: 없음 (순수 함수)

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/youtube.test.ts
import { describe, expect, it } from 'vitest'
import { extractYoutubeId } from './youtube'

describe('extractYoutubeId', () => {
  it('watch?v= 형식에서 id 추출', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('youtu.be 축약 링크에서 id 추출', () => {
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('추가 쿼리 파라미터가 있어도 id 추출', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ')
  })

  it('유튜브 형식이 아니면 null 반환', () => {
    expect(extractYoutubeId('https://example.com/video')).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/youtube.test.ts`
Expected: FAIL — `lib/youtube.ts` 모듈 없음 (Cannot find module './youtube')

- [ ] **Step 3: 최소 구현 작성**

```ts
// lib/youtube.ts
export function extractYoutubeId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]

  return null
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/youtube.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/youtube.ts lib/youtube.test.ts
git commit -m "feat: 유튜브 URL에서 video id 추출하는 유틸 추가"
```

---

### Task 3: `/api/videos` GET route

**Files:**
- Create: `app/api/videos/route.ts`

**Interfaces:**
- Consumes: `createServerSupabase` from `@/lib/supabase/server` (기존 `app/api/history/route.ts`와 동일 패턴), `exercise_videos` 테이블 (Task 1)
- Produces: `GET /api/videos` → `200 { categories: { category: string, items: { id: string, name: string, youtube_url: string }[] }[] }` 또는 `401 { error: string }`

- [ ] **Step 1: route 작성**

```ts
// app/api/videos/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { data: videos, error } = await supabase
    .from('exercise_videos')
    .select('id, category, name, youtube_url, sort_order')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const grouped = new Map<string, { id: string; name: string; youtube_url: string }[]>()
  for (const v of videos ?? []) {
    const list = grouped.get(v.category) ?? []
    list.push({ id: v.id, name: v.name, youtube_url: v.youtube_url })
    grouped.set(v.category, list)
  }

  const categories = Array.from(grouped.entries()).map(([category, items]) => ({ category, items }))

  return NextResponse.json({ categories })
}
```

- [ ] **Step 2: 로그인 없이 호출 시 401 확인**

Run: `npm run dev` 실행 후 `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/videos`
Expected: `401`

- [ ] **Step 3: 로그인 상태로 호출 시 200과 빈 배열 확인 (아직 데이터 없음)**

브라우저에서 로그인 후 `/api/videos` 접속
Expected: `{"categories":[]}`

- [ ] **Step 4: Commit**

```bash
git add app/api/videos/route.ts
git commit -m "feat: 운동 영상 목록 API 추가"
```

---

### Task 4: TopTabs에 "운동법" 탭 추가

**Files:**
- Modify: `app/components/TopTabs.tsx:6-10`

**Interfaces:**
- Consumes: 없음 (기존 컴포넌트 수정)
- Produces: `/videos` 경로가 탭 목록에 포함됨 — Task 5의 페이지가 이 경로로 라우팅됨

- [ ] **Step 1: TABS 배열에 항목 추가**

`app/components/TopTabs.tsx:6-10`을 다음으로 교체:

```ts
const TABS = [
  { href: '/today', label: '오늘' },
  { href: '/history', label: '기록' },
  { href: '/videos', label: '운동법' },
  { href: '/profile', label: '프로필' },
]
```

- [ ] **Step 2: 브라우저에서 탭 4개 노출 확인**

`npm run dev` 실행 후 아무 탭 페이지(`/today` 등) 접속, 상단에 탭 4개(오늘/기록/운동법/프로필) 보이는지 확인

- [ ] **Step 3: Commit**

```bash
git add app/components/TopTabs.tsx
git commit -m "feat: 상단 탭에 운동법 탭 추가"
```

---

### Task 5: `/videos` 페이지

**Files:**
- Create: `app/videos/page.tsx`
- Modify: `app/globals.css` (영상 카드용 스타일 추가)

**Interfaces:**
- Consumes: `GET /api/videos` (Task 3의 응답 형태), `extractYoutubeId` from `@/lib/youtube` (Task 2), `TopTabs` from `@/app/components/TopTabs`
- Produces: 없음 (최종 화면)

- [ ] **Step 1: 페이지 작성**

```tsx
// app/videos/page.tsx
'use client'

import { useEffect, useState } from 'react'
import TopTabs from '@/app/components/TopTabs'
import { extractYoutubeId } from '@/lib/youtube'

interface VideoItem {
  id: string
  name: string
  youtube_url: string
}

interface VideosResponse {
  categories: { category: string; items: VideoItem[] }[]
}

export default function VideosPage() {
  const [data, setData] = useState<VideosResponse | null>(null)

  useEffect(() => {
    fetch('/api/videos')
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

  return (
    <>
      <TopTabs />
      <main className="page">
        <h1 className="page-title">운동기구 사용법</h1>

        {data.categories.length === 0 && (
          <p className="text-secondary">아직 등록된 영상이 없어요</p>
        )}

        {data.categories.map((group) => (
          <section key={group.category} className="stack">
            <span className="card-title">{group.category}</span>
            {group.items.map((item) => {
              const videoId = extractYoutubeId(item.youtube_url)
              return (
                <div className="card" key={item.id}>
                  <span className="card-title">{item.name}</span>
                  {videoId ? (
                    <iframe
                      className="video-embed"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={item.name}
                      allowFullScreen
                    />
                  ) : (
                    <a className="text-link" href={item.youtube_url} target="_blank" rel="noreferrer">
                      영상 링크 열기
                    </a>
                  )}
                </div>
              )
            })}
          </section>
        ))}
      </main>
    </>
  )
}
```

- [ ] **Step 2: `app/globals.css`에 영상 임베드 스타일 추가**

`app/globals.css`의 `.list { ... }` 블록(현재 파일 끝, 273-278행) 뒤에 추가:

```css
.video-embed {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: none;
  border-radius: var(--radius-md);
}
```

- [ ] **Step 3: 브라우저 확인 — 데이터 없을 때**

`npm run dev` 실행, 로그인 후 `/videos` 접속
Expected: "아직 등록된 영상이 없어요" 문구 표시

- [ ] **Step 4: Supabase에 더미 영상 1건 넣고 재확인**

`exercise_videos`에 다음 더미 행 삽입 (Supabase 콘솔 또는 MCP `execute_sql`):

```sql
insert into exercise_videos (category, name, youtube_url, sort_order)
values ('하체', '레그프레스 사용법', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1);
```

`/videos` 새로고침
Expected: "하체" 섹션 아래 "레그프레스 사용법" 카드와 재생 가능한 영상 표시. 확인 후 테스트용 더미 행은 삭제.

- [ ] **Step 5: Commit**

```bash
git add app/videos/page.tsx app/globals.css
git commit -m "feat: 운동기구 사용법 영상 탭 화면 추가"
```
