# 운동기구 사용법 영상 탭 설계

## 목적
헬스 운동기구 사용법을 보여주는 유튜브 영상을 앱 안에서 볼 수 있게 새 탭 추가.

## 범위
- 전체 사용자 공용 목록 (개인 보유 기구 필터링 없음)
- 유튜브 링크 임베드 방식
- 기구 하나당 영상 하나, 카테고리로 분류

## 데이터 모델
새 테이블 `exercise_videos` (공용, 사용자 개인 데이터 아님):

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

- insert/update는 관리자만 (앱에서 쓰기 기능 없음, Supabase 대시보드에서 직접 입력)
- 초기 데이터는 없음 — 화면 먼저 만들고 실제 영상은 나중에 Supabase에 채워 넣음

## API
`app/api/videos/route.ts` (GET)
- `exercise_videos` 전체 select, `category, sort_order` 순 정렬
- 응답: `{ category: string, items: { id, name, youtube_url }[] }[]` (카테고리별로 그룹핑)

## 화면
`app/videos/page.tsx`
- 기존 `app/history/page.tsx` 패턴 따름: `'use client'`, TopTabs, useEffect fetch, 로딩 상태
- 카테고리별 섹션 제목 + 그 아래 영상 리스트
- 영상은 `<iframe>` 임베드, `youtube_url`에서 video id 추출하는 유틸 함수 필요 (`lib/youtube.ts` 등, 일반 `watch?v=` / `youtu.be/` 형식 지원)
- 데이터 없을 때: "아직 등록된 영상이 없어요" 안내 문구

## 네비게이션
`app/components/TopTabs.tsx`의 `TABS` 배열에 항목 추가:
```ts
{ href: '/videos', label: '운동법' }
```

## 에러 처리
- fetch 실패 시 history 페이지와 동일하게 최소한의 처리 (기존 코드에 별도 에러 핸들링 없음 — 패턴 일치시킴)
- 잘못된 유튜브 URL로 video id 추출 실패 시 해당 항목은 iframe 대신 원본 링크만 표시

## 테스트
- 자동화 테스트 기존에 없음(프로젝트 전반) — 수동으로 브라우저에서 탭 이동, 영상 재생 확인
