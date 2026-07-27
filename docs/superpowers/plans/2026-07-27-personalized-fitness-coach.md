# 초개인화 헬스 트레이닝 서비스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로필(신체정보/목표/환경/기구/알레르기)을 입력하면 AI가 주 단위 운동+식단 계획을 생성하고, 매일 접속 시 "오늘 할 일"을 보여주며, 진행 순번 기반으로 이어서 진행할 수 있는 개인 맞춤 헬스 코칭 웹서비스.

**Architecture:** Next.js 14(App Router, TypeScript) + Supabase(Auth/Postgres/Storage, 프로젝트 ref `rrhwiqdjwiytrrfszniw`) + OpenRouter(텍스트/비전 모델) 조합. 모든 사용자 데이터는 Supabase RLS로 계정별 분리하며, 서버는 사용자 세션 기반 클라이언트로만 데이터에 접근한다(서비스 롤 키 미사용). Vercel에 배포.

**Tech Stack:** Next.js 14, TypeScript, @supabase/supabase-js, @supabase/ssr, cheerio, Vitest, OpenRouter API, Vercel.

## Global Constraints

- 모든 비밀 키(OpenRouter API 키 등)는 `.env.local`에만 저장하고 코드에 하드코딩하지 않는다 (CLAUDE.md 보안 규칙).
- 실제 개인정보·대외비 데이터를 예시/테스트 데이터로 사용하지 않는다.
- 배포 직전 비밀 키·개인정보 유출 여부를 점검한다.
- 모든 파일과 응답은 UTF-8로 저장하여 한글이 깨지지 않게 한다.
- 요청받지 않은 기능을 임의로 추가하지 않는다. 파일/코드 삭제 전에는 사용자에게 먼저 확인받는다.
- 검색엔진 스크래핑(기구 조회)은 차단될 수 있음을 이미 사용자에게 고지했다 — 실패 시 서비스 전체가 죽지 않고 빈 체크리스트로 폴백해야 한다.

---

## 사전 준비 (사용자가 직접 할 일)

1. Supabase 프로젝트는 이미 존재함 (`rrhwiqdjwiytrrfszniw`, region ap-northeast-2). 이 프로젝트를 그대로 사용한다.
2. openrouter.ai 가입 후 API 키 발급 → `.env.local`의 `OPENROUTER_API_KEY`에 입력.
3. Supabase 대시보드 → Project Settings → API 에서 `anon public` 키를 확인 (Task 2에서 MCP로도 조회 가능).

---

### Task 1: 프로젝트 초기 세팅

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `vitest.config.ts`, `.env.example`, `.gitignore`, `README.md`

**Interfaces:**
- Produces: Next.js App Router 프로젝트 골격, `npm test` 명령, `.env.example`에 정의된 환경변수 목록

- [ ] **Step 1: git 저장소 초기화**

```bash
git init
```

- [ ] **Step 2: Next.js 프로젝트 생성**

```bash
npx create-next-app@latest . --typescript --eslint --app --no-src-dir --import-alias "@/*" --no-tailwind --use-npm --no-turbopack
```

프롬프트가 뜨면 위 플래그와 동일한 기본값으로 진행한다.

- [ ] **Step 3: 필요한 패키지 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr cheerio
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 4: 테스트 설정 파일 작성**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
```

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run"
```

- [ ] **Step 5: 환경변수 템플릿 작성**

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=https://rrhwiqdjwiytrrfszniw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=
OPENROUTER_TEXT_MODEL=openai/gpt-4o-mini
OPENROUTER_VISION_MODEL=openai/gpt-4o-mini
```

`.env.local`을 직접 만들어 실제 값을 채운다 (이 파일은 `.gitignore`에 포함되어야 함).

- [ ] **Step 6: `.gitignore` 확인**

`.gitignore`에 아래 항목이 있는지 확인하고 없으면 추가:
```
.env.local
.env*.local
node_modules
.next
```

- [ ] **Step 7: 기본 홈페이지 작성**

`app/page.tsx`:
```tsx
export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>초개인화 헬스 트레이닝</h1>
      <p>
        <a href="/login">로그인</a> · <a href="/signup">회원가입</a>
      </p>
    </main>
  )
}
```

- [ ] **Step 8: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 완료

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "chore: 프로젝트 초기 세팅"
```

---

### Task 2: Supabase 스키마 (테이블 4개 + RLS + Storage)

**Files:**
- Create: `supabase/migrations/0001_init.sql` (기록용, 실제 적용은 Supabase MCP `apply_migration`으로 수행)
- Create: `lib/supabase/types.ts`

**Interfaces:**
- Produces: `profiles`, `gym_equipment`, `weekly_plans`, `daily_progress` 테이블과 각 테이블의 RLS 정책, `inbody-photos` 비공개 스토리지 버킷

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/0001_init.sql`:
```sql
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  height_cm numeric not null,
  weight_kg numeric not null,
  body_fat_pct numeric,
  muscle_mass_kg numeric,
  age integer not null,
  gender text not null check (gender in ('male','female')),
  experience_level text not null check (experience_level in ('beginner','intermediate','advanced')),
  weekly_days integer not null,
  session_minutes integer not null,
  goal text check (goal in ('cut','bulk','maintain')),
  environment text not null check (environment in ('gym','home')),
  gym_name text,
  allergies text[] not null default '{}',
  day_pointer integer not null default 1,
  last_progress_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gym_equipment (
  user_id uuid primary key references auth.users(id) on delete cascade,
  equipment text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_number integer not null,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_number)
);

create table daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_pointer integer not null,
  completed_at timestamptz not null default now(),
  unique (user_id, day_pointer)
);

alter table profiles enable row level security;
alter table gym_equipment enable row level security;
alter table weekly_plans enable row level security;
alter table daily_progress enable row level security;

create policy "본인 프로필만 조회/수정" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "본인 기구 목록만 조회/수정" on gym_equipment
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "본인 계획만 조회/수정" on weekly_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "본인 진행기록만 조회/수정" on daily_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('inbody-photos', 'inbody-photos', false)
on conflict (id) do nothing;

create policy "본인 인바디 사진만 업로드"
  on storage.objects for insert
  with check (bucket_id = 'inbody-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "본인 인바디 사진만 조회"
  on storage.objects for select
  using (bucket_id = 'inbody-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Supabase MCP로 마이그레이션 적용**

`mcp__supabase__apply_migration` 도구를 사용해 project_id `rrhwiqdjwiytrrfszniw`에 위 SQL을 `init_fitness_schema`라는 이름으로 적용한다.

- [ ] **Step 3: 적용 확인**

`mcp__supabase__list_tables` (project_id: `rrhwiqdjwiytrrfszniw`, schemas: `["public"]`)로 4개 테이블이 모두 보이는지 확인한다.
Expected: `profiles`, `gym_equipment`, `weekly_plans`, `daily_progress` 모두 `rls_enabled: true`

- [ ] **Step 4: TypeScript 타입 생성**

`mcp__supabase__generate_typescript_types` (project_id: `rrhwiqdjwiytrrfszniw`)로 받은 결과를 `lib/supabase/types.ts`에 저장한다.

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/0001_init.sql lib/supabase/types.ts
git commit -m "feat: Supabase 스키마 및 RLS 정책 추가"
```

---

### Task 3: Supabase 클라이언트 & 인증 (로그인/회원가입/미들웨어)

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `middleware.ts`
- Create: `app/login/page.tsx`, `app/signup/page.tsx`
- Create: `app/api/auth/callback/route.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Produces: `createServerSupabase()`, `createBrowserSupabase()` — 이후 모든 Task에서 이 두 함수로만 Supabase에 접근한다.

- [ ] **Step 1: 서버용 Supabase 클라이언트**

`lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
```

- [ ] **Step 2: 브라우저용 Supabase 클라이언트**

`lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: 세션 갱신 미들웨어**

`middleware.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/api/auth/callback']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getUser()
  const isPublic = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))

  if (!data.user && !isPublic && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: 회원가입 페이지**

`app/signup/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError('가입에 실패했습니다: ' + error.message)
      return
    }
    router.push('/login')
  }

  return (
    <main style={{ padding: 24, maxWidth: 400 }}>
      <h1>회원가입</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button type="submit">가입하기</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </main>
  )
}
```

- [ ] **Step 5: 로그인 페이지**

`app/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('로그인에 실패했습니다: ' + error.message)
      return
    }
    router.push('/today')
    router.refresh()
  }

  return (
    <main style={{ padding: 24, maxWidth: 400 }}>
      <h1>로그인</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">로그인</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </main>
  )
}
```

- [ ] **Step 6: 수동 테스트**

`npm run dev` 실행 후 브라우저에서 `/signup`으로 실제 테스트 계정을 만들고 `/login`으로 로그인이 되는지 확인한다. 로그인 후 `/today` 접속 시 리다이렉트 루프 없이 페이지(빈 화면이어도 무방, Task 9에서 완성)가 뜨는지 확인한다.
Expected: 가입 → 로그인 → 세션 쿠키 생성 확인 (브라우저 개발자도구 Application 탭에서 `sb-` 로 시작하는 쿠키 존재)

- [ ] **Step 7: 커밋**

```bash
git add lib/supabase middleware.ts app/login app/signup
git commit -m "feat: Supabase Auth 로그인/회원가입 및 라우트 보호"
```

---

### Task 4: 프로필 CRUD (기본 필드)

**Files:**
- Create: `lib/profile.ts`
- Create: `app/api/profile/route.ts`
- Create: `app/profile/page.tsx`
- Test: `lib/profile.test.ts`

**Interfaces:**
- Consumes: `createServerSupabase()` (Task 3)
- Produces: `getProfile(supabase, userId)`, `upsertProfile(supabase, userId, input)` — Task 5, 6, 7, 9가 이 함수들로 프로필을 읽고 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/profile.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { upsertProfile } from './profile'

describe('upsertProfile', () => {
  it('필수 필드가 없으면 에러를 던진다', async () => {
    const fakeSupabase = { from: vi.fn() } as any
    await expect(
      upsertProfile(fakeSupabase, 'user-1', {} as any)
    ).rejects.toThrow('필수 입력값이 누락되었습니다')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL (`upsertProfile` 함수가 없음)

- [ ] **Step 3: 프로필 모듈 구현**

`lib/profile.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProfileInput {
  heightCm: number
  weightKg: number
  bodyFatPct?: number
  muscleMassKg?: number
  age: number
  gender: 'male' | 'female'
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  weeklyDays: number
  sessionMinutes: number
  goal?: 'cut' | 'bulk' | 'maintain'
  environment: 'gym' | 'home'
  gymName?: string
  allergies: string[]
}

const REQUIRED_KEYS: (keyof ProfileInput)[] = [
  'heightCm',
  'weightKg',
  'age',
  'gender',
  'experienceLevel',
  'weeklyDays',
  'sessionMinutes',
  'environment',
]

export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ProfileInput
) {
  const missing = REQUIRED_KEYS.filter((key) => input[key] === undefined || input[key] === null)
  if (missing.length > 0) {
    throw new Error('필수 입력값이 누락되었습니다: ' + missing.join(', '))
  }

  const { error } = await supabase.from('profiles').upsert({
    user_id: userId,
    height_cm: input.heightCm,
    weight_kg: input.weightKg,
    body_fat_pct: input.bodyFatPct ?? null,
    muscle_mass_kg: input.muscleMassKg ?? null,
    age: input.age,
    gender: input.gender,
    experience_level: input.experienceLevel,
    weekly_days: input.weeklyDays,
    session_minutes: input.sessionMinutes,
    goal: input.goal ?? null,
    environment: input.environment,
    gym_name: input.gymName ?? null,
    allergies: input.allergies,
    updated_at: new Date().toISOString(),
  })

  if (error) throw new Error('프로필 저장에 실패했습니다: ' + error.message)
}

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error('프로필 조회에 실패했습니다: ' + error.message)
  return data
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: API 라우트**

`app/api/profile/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getProfile, upsertProfile, type ProfileInput } from '@/lib/profile'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const profile = await getProfile(supabase, userData.user.id)
  return NextResponse.json({ profile })
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const input = (await request.json()) as ProfileInput

  try {
    await upsertProfile(supabase, userData.user.id, input)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 6: 프로필 입력 화면 (기본 필드)**

`app/profile/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [form, setForm] = useState({
    heightCm: '',
    weightKg: '',
    age: '',
    gender: 'male',
    experienceLevel: 'beginner',
    weeklyDays: '3',
    sessionMinutes: '60',
    goal: '',
    environment: 'home',
    gymName: '',
    allergies: '',
  })
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        age: Number(form.age),
        gender: form.gender,
        experienceLevel: form.experienceLevel,
        weeklyDays: Number(form.weeklyDays),
        sessionMinutes: Number(form.sessionMinutes),
        goal: form.goal || undefined,
        environment: form.environment,
        gymName: form.gymName || undefined,
        allergies: form.allergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    })
    if (res.ok) {
      setMessage('저장되었습니다.')
      router.push('/today')
    } else {
      const data = await res.json()
      setMessage('오류: ' + data.error)
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1>프로필 입력</h1>
      <form onSubmit={handleSubmit}>
        <label>키(cm) <input value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} required /></label>
        <label>몸무게(kg) <input value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} required /></label>
        <label>나이 <input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required /></label>
        <label>성별
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </label>
        <label>운동 경력
          <select value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}>
            <option value="beginner">초보</option>
            <option value="intermediate">중급</option>
            <option value="advanced">고급</option>
          </select>
        </label>
        <label>주당 가능 일수 <input value={form.weeklyDays} onChange={(e) => setForm({ ...form, weeklyDays: e.target.value })} required /></label>
        <label>1회 가능 시간(분) <input value={form.sessionMinutes} onChange={(e) => setForm({ ...form, sessionMinutes: e.target.value })} required /></label>
        <label>목표
          <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
            <option value="">AI에게 맡기기</option>
            <option value="cut">감량</option>
            <option value="bulk">근육증가</option>
            <option value="maintain">유지</option>
          </select>
        </label>
        <label>운동 환경
          <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
            <option value="home">홈트레이닝</option>
            <option value="gym">헬스장</option>
          </select>
        </label>
        {form.environment === 'gym' && (
          <label>헬스장 이름 <input value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} /></label>
        )}
        <label>음식 알레르기/기피 (쉼표로 구분) <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></label>
        <button type="submit">저장</button>
      </form>
      {message && <p>{message}</p>}
    </main>
  )
}
```

- [ ] **Step 7: 수동 테스트**

`npm run dev` 실행 후 로그인 상태에서 `/profile`에 값을 입력하고 저장 → Supabase 대시보드(Table Editor)에서 `profiles` 테이블에 행이 생겼는지 직접 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add lib/profile.ts lib/profile.test.ts app/api/profile app/profile
git commit -m "feat: 프로필 입력/조회 기능 추가"
```

---

### Task 5: 인바디 사진 업로드 + AI OCR

**Files:**
- Create: `lib/inbodyOcr.ts`
- Create: `app/api/inbody/route.ts`
- Modify: `app/profile/page.tsx` (인바디 업로드 UI 추가)
- Test: `lib/inbodyOcr.test.ts`

**Interfaces:**
- Consumes: `OPENROUTER_API_KEY`, `OPENROUTER_VISION_MODEL`
- Produces: `analyzeInbodyPhoto(base64Image): Promise<{ bodyFatPct: number | null; muscleMassKg: number | null }>` — Task 4의 프로필 폼이 이 결과를 받아 필드에 채운다.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/inbodyOcr.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeInbodyPhoto } from './inbodyOcr'

describe('analyzeInbodyPhoto', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('AI 응답을 파싱해 숫자를 반환한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: '{"bodyFatPct": 18.5, "muscleMassKg": 32.1}' } },
        ],
      }),
    }) as any

    const result = await analyzeInbodyPhoto('data:image/png;base64,AAA')
    expect(result).toEqual({ bodyFatPct: 18.5, muscleMassKg: 32.1 })
  })

  it('숫자를 못 읽으면 null을 반환한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"bodyFatPct": null, "muscleMassKg": null}' } }],
      }),
    }) as any

    const result = await analyzeInbodyPhoto('data:image/png;base64,AAA')
    expect(result).toEqual({ bodyFatPct: null, muscleMassKg: null })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL (`inbodyOcr` 모듈 없음)

- [ ] **Step 3: 구현**

`lib/inbodyOcr.ts`:
```ts
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface InbodyResult {
  bodyFatPct: number | null
  muscleMassKg: number | null
}

export async function analyzeInbodyPhoto(base64Image: string): Promise<InbodyResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY가 설정되지 않았습니다.')

  const model = process.env.OPENROUTER_VISION_MODEL ?? 'openai/gpt-4o-mini'

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                '이 인바디(체성분 분석) 결과지 사진에서 체지방률(%)과 골격근량(kg)을 읽어서 ' +
                '반드시 다음 JSON 형식으로만 답하세요: {"bodyFatPct": 숫자 또는 null, "muscleMassKg": 숫자 또는 null}. ' +
                '숫자를 확실히 읽을 수 없으면 null을 넣으세요.',
            },
            { type: 'image_url', image_url: { url: base64Image } },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter 요청이 실패했습니다 (status: ${response.status})`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter 응답에 내용이 없습니다.')

  const parsed = JSON.parse(content)
  return {
    bodyFatPct: parsed.bodyFatPct ?? null,
    muscleMassKg: parsed.muscleMassKg ?? null,
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: API 라우트**

`app/api/inbody/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { analyzeInbodyPhoto } from '@/lib/inbodyOcr'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { imageBase64 } = await request.json()
  if (!imageBase64) {
    return NextResponse.json({ error: '이미지가 없습니다' }, { status: 400 })
  }

  try {
    const result = await analyzeInbodyPhoto(imageBase64)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
```

- [ ] **Step 6: 프로필 화면에 업로드 UI 추가**

`app/profile/page.tsx`의 폼 상단(성별 입력 위)에 아래 블록을 추가하고, `bodyFatPct`/`muscleMassKg` state를 추가해 저장 시 함께 전송한다:

```tsx
<label>
  인바디 사진 업로드 (선택)
  <input
    type="file"
    accept="image/*"
    onChange={async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async () => {
        const res = await fetch('/api/inbody', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: reader.result }),
        })
        if (res.ok) {
          const data = await res.json()
          setForm((prev) => ({
            ...prev,
            bodyFatPct: data.bodyFatPct != null ? String(data.bodyFatPct) : prev.bodyFatPct,
            muscleMassKg: data.muscleMassKg != null ? String(data.muscleMassKg) : prev.muscleMassKg,
          }))
          setMessage(
            data.bodyFatPct != null
              ? '인바디 사진에서 값을 읽었습니다. 확인 후 저장하세요.'
              : '사진에서 값을 정확히 읽지 못했습니다. 직접 입력해주세요.'
          )
        }
      }
      reader.readAsDataURL(file)
    }}
  />
</label>
<label>체지방률(%) <input value={form.bodyFatPct} onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })} /></label>
<label>골격근량(kg) <input value={form.muscleMassKg} onChange={(e) => setForm({ ...form, muscleMassKg: e.target.value })} /></label>
```

`form` 초기 state와 제출 payload에 `bodyFatPct: ''`, `muscleMassKg: ''` 및 `bodyFatPct: form.bodyFatPct ? Number(form.bodyFatPct) : undefined` (muscleMassKg도 동일)를 추가한다.

- [ ] **Step 7: 수동 테스트**

실제 인바디 결과지 사진(또는 비슷한 형식의 임의 이미지)으로 업로드해보고, 값이 자동으로 채워지는지 / 실패 시 안내 메시지가 뜨는지 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add lib/inbodyOcr.ts lib/inbodyOcr.test.ts app/api/inbody app/profile/page.tsx
git commit -m "feat: 인바디 사진 AI OCR 기능 추가"
```

---

### Task 6: 헬스장 기구 실시간 조회

**Files:**
- Create: `lib/gymEquipment.ts`
- Create: `app/api/gym-equipment/lookup/route.ts`
- Create: `app/api/gym-equipment/route.ts`
- Modify: `app/profile/page.tsx` (기구 체크리스트 UI)
- Test: `lib/gymEquipment.test.ts`

**Interfaces:**
- Consumes: `OPENROUTER_API_KEY`
- Produces: `lookupGymEquipment(gymName): Promise<string[]>` — 실패 시 빈 배열 반환(폴백), 예외를 던지지 않음.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/gymEquipment.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lookupGymEquipment } from './gymEquipment'

describe('lookupGymEquipment', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('검색이 차단되면 빈 배열을 반환한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 }) as any
    const result = await lookupGymEquipment('테스트 헬스장')
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL (`gymEquipment` 모듈 없음)

- [ ] **Step 3: 구현**

`lib/gymEquipment.ts`:
```ts
import * as cheerio from 'cheerio'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

async function searchGymText(gymName: string): Promise<string> {
  const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(gymName + ' 보유 기구')}`

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) return ''

  const html = await response.text()
  const $ = cheerio.load(html)
  $('script, style').remove()
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000)
}

export async function lookupGymEquipment(gymName: string): Promise<string[]> {
  try {
    const text = await searchGymText(gymName)
    if (!text || text.length < 30) return []

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return []

    const model = process.env.OPENROUTER_TEXT_MODEL ?? 'openai/gpt-4o-mini'

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content:
              `다음은 "${gymName}"에 대한 검색 결과 텍스트입니다. 이 헬스장에 있을 것으로 ` +
              `보이는 운동 기구 이름만 뽑아서 다음 JSON 형식으로 답하세요: ` +
              `{"equipment": ["기구명1", "기구명2"]}. 확실하지 않으면 빈 배열을 반환하세요.\n\n${text}`,
          },
        ],
      }),
    })

    if (!response.ok) return []

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return []

    const parsed = JSON.parse(content)
    return Array.isArray(parsed.equipment) ? parsed.equipment : []
  } catch {
    return []
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 조회 API 라우트**

`app/api/gym-equipment/lookup/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { lookupGymEquipment } from '@/lib/gymEquipment'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { gymName } = await request.json()
  if (!gymName) return NextResponse.json({ error: '헬스장 이름이 필요합니다' }, { status: 400 })

  const equipment = await lookupGymEquipment(gymName)
  return NextResponse.json({ equipment })
}
```

- [ ] **Step 6: 저장 API 라우트**

`app/api/gym-equipment/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { equipment } = (await request.json()) as { equipment: string[] }

  const { error } = await supabase.from('gym_equipment').upsert({
    user_id: userData.user.id,
    equipment,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 7: 프로필 화면에 체크리스트 UI 추가**

`app/profile/page.tsx`에 `equipmentList: string[]`, `checkedEquipment: string[]` state를 추가하고, 운동 환경이 `gym`일 때만 아래 블록을 헬스장 이름 입력 아래에 표시한다:

```tsx
<button
  type="button"
  onClick={async () => {
    setMessage('헬스장 정보를 검색하고 있습니다...')
    const res = await fetch('/api/gym-equipment/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gymName: form.gymName }),
    })
    const data = await res.json()
    setEquipmentList(data.equipment ?? [])
    setCheckedEquipment(data.equipment ?? [])
    setMessage(
      data.equipment?.length
        ? '기구 목록을 찾았습니다. 확인 후 수정하세요.'
        : '자동으로 찾지 못했습니다. 직접 체크해주세요.'
    )
  }}
>
  기구 자동 조회
</button>
{['덤벨', '바벨', '스미스머신', '렛풀다운', '레그프레스', '케틀벨', '러닝머신', '벤치프레스'].map(
  (item) => (
    <label key={item} style={{ display: 'block' }}>
      <input
        type="checkbox"
        checked={checkedEquipment.includes(item)}
        onChange={(e) => {
          setCheckedEquipment((prev) =>
            e.target.checked ? [...prev, item] : prev.filter((x) => x !== item)
          )
        }}
      />
      {item}
    </label>
  )
)}
```

저장 버튼 클릭 시(폼 submit 핸들러 안에서) 프로필 저장에 이어 아래 호출을 추가한다:
```tsx
await fetch('/api/gym-equipment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ equipment: checkedEquipment }),
})
```

- [ ] **Step 8: 수동 테스트**

실제 헬스장 이름(예: 잘 알려진 프랜차이즈 지점명)으로 "기구 자동 조회"를 눌러보고, 검색이 되는 경우와 차단/실패로 빈 목록이 뜨는 경우 둘 다 화면이 정상 동작하는지 확인한다.

- [ ] **Step 9: 커밋**

```bash
git add lib/gymEquipment.ts lib/gymEquipment.test.ts app/api/gym-equipment app/profile/page.tsx
git commit -m "feat: 헬스장 기구 실시간 조회 및 체크리스트"
```

---

### Task 7: AI 주간 계획 생성

**Files:**
- Create: `lib/planGenerator.ts`
- Test: `lib/planGenerator.test.ts`

**Interfaces:**
- Consumes: `OPENROUTER_API_KEY`, `OPENROUTER_TEXT_MODEL`, Task 4의 `ProfileInput` 형태, `gym_equipment.equipment: string[]`
- Produces: `generateWeeklyPlan(profile, equipment, adherenceNote?): Promise<WeeklyPlan>` 타입 `WeeklyPlan = { days: { workout: string; diet: string }[] }` (정확히 7개 원소) — Task 9가 이 함수를 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/planGenerator.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateWeeklyPlan } from './planGenerator'

const fakeProfile = {
  heightCm: 175,
  weightKg: 70,
  age: 30,
  gender: 'male' as const,
  experienceLevel: 'beginner' as const,
  weeklyDays: 3,
  sessionMinutes: 60,
  goal: 'cut' as const,
  environment: 'home' as const,
  allergies: [],
}

describe('generateWeeklyPlan', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('7일치 계획을 반환한다', async () => {
    const days = Array.from({ length: 7 }, (_, i) => ({
      workout: `운동 ${i + 1}`,
      diet: `식단 ${i + 1}`,
    }))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ days }) } }],
      }),
    }) as any

    const result = await generateWeeklyPlan(fakeProfile, [])
    expect(result.days).toHaveLength(7)
    expect(result.days[0].workout).toBe('운동 1')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL (`planGenerator` 모듈 없음)

- [ ] **Step 3: 구현**

`lib/planGenerator.ts`:
```ts
import type { ProfileInput } from './profile'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface DayPlan {
  workout: string
  diet: string
}

export interface WeeklyPlan {
  days: DayPlan[]
}

export async function generateWeeklyPlan(
  profile: ProfileInput,
  equipment: string[],
  adherenceNote?: string
): Promise<WeeklyPlan> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY가 설정되지 않았습니다.')

  const model = process.env.OPENROUTER_TEXT_MODEL ?? 'openai/gpt-4o-mini'

  const prompt = `다음 사용자 정보를 바탕으로 7일치 운동 루틴과 식단 계획을 만들어주세요.

- 키: ${profile.heightCm}cm, 몸무게: ${profile.weightKg}kg
- 나이: ${profile.age}, 성별: ${profile.gender === 'male' ? '남성' : '여성'}
- 운동 경력: ${profile.experienceLevel}
- 주당 가능 일수: ${profile.weeklyDays}일, 1회 가능 시간: ${profile.sessionMinutes}분
- 목표: ${profile.goal ?? '데이터를 보고 적절히 판단'}
- 운동 환경: ${profile.environment === 'gym' ? '헬스장' : '홈트레이닝'}
- 보유 기구: ${equipment.length ? equipment.join(', ') : '없음(맨몸 운동 위주)'}
- 음식 알레르기/기피: ${profile.allergies.length ? profile.allergies.join(', ') : '없음'}
${adherenceNote ? `- 지난주 진행 상황: ${adherenceNote}` : ''}

주당 가능 일수만큼만 운동일로 채우고 나머지는 휴식일("휴식")로 표시하세요.
반드시 아래 JSON 형식으로만, 정확히 7개 요소로 답하세요:
{"days": [{"workout": "1일차 운동 내용", "diet": "1일차 식단 내용"}, ... 7개]}`

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter 요청이 실패했습니다 (status: ${response.status})`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter 응답에 내용이 없습니다.')

  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed.days) || parsed.days.length !== 7) {
    throw new Error('AI가 7일치 계획을 올바른 형식으로 생성하지 못했습니다.')
  }

  return { days: parsed.days }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/planGenerator.ts lib/planGenerator.test.ts
git commit -m "feat: AI 주간 운동/식단 계획 생성 모듈"
```

---

### Task 8: 진행 순번(day pointer) 및 재시작 로직

**Files:**
- Create: `lib/dayPointer.ts`
- Test: `lib/dayPointer.test.ts`

**Interfaces:**
- Produces: `shouldRegeneratePlan(lastProgressAt, now): boolean`, `getCurrentWeekAndDay(dayPointer): { weekNumber: number; dayInWeek: number }` — Task 9가 "오늘의 할 일"을 계산할 때 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/dayPointer.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { shouldRegeneratePlan, getCurrentWeekAndDay } from './dayPointer'

describe('shouldRegeneratePlan', () => {
  it('마지막 진행일이 없으면 재생성하지 않는다(최초 생성 케이스)', () => {
    expect(shouldRegeneratePlan(null, new Date('2026-07-27'))).toBe(false)
  })

  it('3일 미만 공백이면 재생성하지 않는다', () => {
    const last = new Date('2026-07-25T00:00:00Z')
    const now = new Date('2026-07-27T00:00:00Z')
    expect(shouldRegeneratePlan(last, now)).toBe(false)
  })

  it('3일 이상 공백이면 재생성한다', () => {
    const last = new Date('2026-07-20T00:00:00Z')
    const now = new Date('2026-07-27T00:00:00Z')
    expect(shouldRegeneratePlan(last, now)).toBe(true)
  })
})

describe('getCurrentWeekAndDay', () => {
  it('day_pointer 1은 1주차 1일차다', () => {
    expect(getCurrentWeekAndDay(1)).toEqual({ weekNumber: 1, dayInWeek: 1 })
  })

  it('day_pointer 8은 2주차 1일차다', () => {
    expect(getCurrentWeekAndDay(8)).toEqual({ weekNumber: 2, dayInWeek: 1 })
  })

  it('day_pointer 14는 2주차 7일차다', () => {
    expect(getCurrentWeekAndDay(14)).toEqual({ weekNumber: 2, dayInWeek: 7 })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL (`dayPointer` 모듈 없음)

- [ ] **Step 3: 구현**

`lib/dayPointer.ts`:
```ts
const REGENERATE_GAP_DAYS = 3
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function shouldRegeneratePlan(lastProgressAt: Date | null, now: Date): boolean {
  if (!lastProgressAt) return false
  const gapDays = (now.getTime() - lastProgressAt.getTime()) / MS_PER_DAY
  return gapDays >= REGENERATE_GAP_DAYS
}

export function getCurrentWeekAndDay(dayPointer: number): {
  weekNumber: number
  dayInWeek: number
} {
  const weekNumber = Math.floor((dayPointer - 1) / 7) + 1
  const dayInWeek = ((dayPointer - 1) % 7) + 1
  return { weekNumber, dayInWeek }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/dayPointer.ts lib/dayPointer.test.ts
git commit -m "feat: 진행 순번 계산 및 재생성 판단 로직"
```

---

### Task 9: "오늘의 할 일" API + 페이지

**Files:**
- Create: `app/api/plan/today/route.ts`
- Create: `app/api/plan/complete/route.ts`
- Create: `app/today/page.tsx`

**Interfaces:**
- Consumes: Task 4 (`getProfile`), Task 7 (`generateWeeklyPlan`), Task 8 (`shouldRegeneratePlan`, `getCurrentWeekAndDay`)
- Produces: 사용자가 실제로 사용하는 메인 화면

- [ ] **Step 1: "오늘의 계획" 조회/생성 API**

`app/api/plan/today/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { generateWeeklyPlan } from '@/lib/planGenerator'
import { shouldRegeneratePlan, getCurrentWeekAndDay } from '@/lib/dayPointer'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  const userId = userData.user.id

  const profile = await getProfile(supabase, userId)
  if (!profile) {
    return NextResponse.json({ error: '프로필을 먼저 입력해주세요', needsProfile: true }, { status: 400 })
  }

  const { data: equipmentRow } = await supabase
    .from('gym_equipment')
    .select('equipment')
    .eq('user_id', userId)
    .maybeSingle()

  const now = new Date()
  const lastProgressAt = profile.last_progress_at ? new Date(profile.last_progress_at) : null
  const needsRegeneration = shouldRegeneratePlan(lastProgressAt, now)

  const { weekNumber, dayInWeek } = getCurrentWeekAndDay(profile.day_pointer)

  const { data: existingPlan } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_number', weekNumber)
    .maybeSingle()

  let plan = existingPlan?.plan as { days: { workout: string; diet: string }[] } | undefined

  if (!plan || needsRegeneration) {
    let adherenceNote: string | undefined
    if (needsRegeneration) {
      const { count } = await supabase
        .from('daily_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      adherenceNote = `총 ${count ?? 0}일 완료함, 최근 3일 이상 공백 발생`
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

    await supabase.from('weekly_plans').upsert({
      user_id: userId,
      week_number: weekNumber,
      plan: generated,
    })

    plan = generated
  }

  return NextResponse.json({
    dayPointer: profile.day_pointer,
    dayInWeek,
    today: plan.days[dayInWeek - 1],
  })
}
```

- [ ] **Step 2: "완료 체크" API**

`app/api/plan/complete/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  const userId = userData.user.id

  const { data: profile } = await supabase
    .from('profiles')
    .select('day_pointer')
    .eq('user_id', userId)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: '프로필이 없습니다' }, { status: 400 })

  const { error: progressError } = await supabase.from('daily_progress').insert({
    user_id: userId,
    day_pointer: profile.day_pointer,
  })
  if (progressError) {
    return NextResponse.json({ error: progressError.message }, { status: 400 })
  }

  const nextPointer = profile.day_pointer + 1
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ day_pointer: nextPointer, last_progress_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  return NextResponse.json({ ok: true, dayPointer: nextPointer })
}
```

- [ ] **Step 3: "오늘의 할 일" 페이지**

`app/today/page.tsx`:
```tsx
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
```

- [ ] **Step 4: 수동 테스트**

프로필을 입력한 테스트 계정으로 `/today`에 접속해 실제로 AI가 생성한 운동/식단이 나오는지 확인한다. "오늘 완료"를 누르고 다시 `/today`를 새로고침해서 다음 날짜(dayPointer 증가)로 넘어가는지 확인한다.
Expected: 완료 후 Supabase `daily_progress`에 행 추가, `profiles.day_pointer` 1 증가

- [ ] **Step 5: 커밋**

```bash
git add app/api/plan app/today
git commit -m "feat: 오늘의 할 일 조회 및 완료 체크 기능"
```

---

### Task 10: 진행 기록/통계 페이지

**Files:**
- Create: `app/api/history/route.ts`
- Create: `app/history/page.tsx`

**Interfaces:**
- Consumes: `daily_progress`, `profiles.day_pointer`

- [ ] **Step 1: 기록 조회 API**

`app/api/history/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { data: progress, error } = await supabase
    .from('daily_progress')
    .select('day_pointer, completed_at')
    .eq('user_id', userData.user.id)
    .order('day_pointer', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('day_pointer')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  return NextResponse.json({
    completedDays: progress ?? [],
    currentDayPointer: profile?.day_pointer ?? 1,
  })
}
```

- [ ] **Step 2: 통계 페이지**

`app/history/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'

interface HistoryResponse {
  completedDays: { day_pointer: number; completed_at: string }[]
  currentDayPointer: number
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null)

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then(setData)
  }, [])

  if (!data) return <main style={{ padding: 24 }}>불러오는 중...</main>

  const totalPossibleDays = Math.max(data.currentDayPointer - 1, 0)
  const completionRate =
    totalPossibleDays > 0
      ? Math.round((data.completedDays.length / totalPossibleDays) * 100)
      : 0

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
```

- [ ] **Step 3: 수동 테스트**

며칠치 "오늘 완료"를 눌러본 뒤 `/history`에서 완료율과 목록이 정확히 표시되는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add app/api/history app/history
git commit -m "feat: 진행 기록/통계 페이지"
```

---

### Task 11: End-to-end 수동 테스트

**Files:** 없음 (코드 작성 없이 검증만 수행)

- [ ] **Step 1: 자동화 테스트 전체 실행**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 실제 흐름 테스트**

`npm run dev`로 로컬 서버를 띄우고, 실제(또는 사용자 본인) 데이터로 아래 순서를 처음부터 끝까지 직접 수행한다:
1. 회원가입 → 로그인
2. 프로필 입력 (인바디 사진 업로드 포함, 헬스장 선택 시 기구 자동 조회 포함)
3. `/today`에서 AI가 생성한 운동/식단 확인
4. "오늘 완료" 클릭 → dayPointer 증가 확인
5. `/history`에서 완료 기록 확인

- [ ] **Step 3: 재생성 로직 검증**

Supabase Table Editor에서 해당 테스트 계정의 `profiles.last_progress_at`을 4일 전 날짜로 수동 수정한 뒤 `/today`를 새로고침 → 같은 주차의 계획이 새로 생성되는지(`weekly_plans` 행의 `created_at`이 갱신되는지) 확인한다.

- [ ] **Step 4: 발견된 문제 수정**

테스트 중 발견된 버그는 해당 Task로 돌아가 수정하고 다시 테스트한다. 문제 없으면 다음 단계로 진행한다.

---

### Task 12: Vercel 배포

**Files:** 없음 (배포 설정만 수행)

- [ ] **Step 1: Vercel 프로젝트 연결**

Vercel MCP(`mcp__vercel__deploy_to_vercel` 또는 동등 도구)로 현재 프로젝트를 team `wobe8333-hubs-projects` (team_mcschLDcliikKNbopbtrYIYr)에 배포한다.

- [ ] **Step 2: 환경변수 설정**

Vercel 프로젝트 설정에 아래 값을 등록한다 (Production/Preview 모두):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_TEXT_MODEL`
- `OPENROUTER_VISION_MODEL`

값 자체는 사용자에게 `.env.local`에서 복사해 Vercel 대시보드에 직접 입력하도록 안내한다 (비밀 값을 대신 입력하지 않음).

- [ ] **Step 3: 배포 전 점검**

- 코드 전체에서 `OPENROUTER_API_KEY`, `SUPABASE` 등 비밀 값이 하드코딩되어 있지 않은지 검색
- `.env.local`이 git에 커밋되지 않았는지 확인 (`git status`, `git log --all -- .env.local`)

- [ ] **Step 4: 배포 실행 및 확인**

배포 후 실제 배포 주소로 접속해 Task 11의 end-to-end 흐름을 한 번 더 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore: 배포 설정 반영"
```

---

## Self-Review 요약

- 스펙의 모든 요구사항(로그인, 프로필 5개 추가 항목, 인바디 OCR, 기구 실시간 조회, 주단위 계획+재생성, day pointer 이어서 진행, 3일 규칙, 오늘 화면, 진행 기록, 보안, 배포)이 Task 1~12에 각각 매핑되어 있음을 확인함.
- 모든 코드 블록은 실제 동작 코드로 작성되었으며 TBD/TODO 없음.
- 타입/함수 시그니처(`ProfileInput`, `WeeklyPlan`, `getCurrentWeekAndDay` 등)는 Task 간 일관되게 사용됨.
