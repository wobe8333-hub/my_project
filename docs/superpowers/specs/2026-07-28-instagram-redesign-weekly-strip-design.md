# 인스타그램 스타일 리디자인 + 주간 스트립 캘린더

날짜: 2026-07-28

## 배경

현재 앱은 토스 스타일 다크 테마([globals.css](../../../app/globals.css))로 구성된 운동/식단 플랜 트래커. 상단 고정 텍스트 탭바([TopTabs.tsx](../../../app/components/TopTabs.tsx)), 오늘 페이지는 오늘 하루치 운동/식단만 보여줌([today/page.tsx](../../../app/today/page.tsx)). 사용자는 (1) 전체적인 톤앤매너를 인스타그램 느낌으로 바꾸고 (2) 오늘 뿐 아니라 앞으로의 계획도 보이길 원함.

## 데이터 제약사항 (확인됨)

- `weekly_plans` 테이블은 사용자의 "이번 사이클" 7일치(`plan.days[0..6]`)만 갖고 있음. 다음 사이클은 이번 사이클이 끝나야 AI가 새로 생성함([plan/today/route.ts](../../../app/api/plan/today/route.ts)).
- `dayInWeek`(1~7)은 실제 월~일 캘린더 주와 무관한 "개인 사이클" 인덱스([dayPointer.ts](../../../lib/dayPointer.ts)). 즉 사이클 1일차가 실제로 수요일에 시작할 수도 있음.
- 따라서 스트립의 각 칸은 실제 달력 요일/날짜(오늘 기준 `오늘 날짜 + (i - dayInWeek)`로 계산한 실제 Date)를 라벨로 쓰고, 그 날짜에 매핑되는 `plan.days[i-1]` 내용을 보여준다. "월~일" 고정 정렬이 아니라 "이번 사이클의 7일이 걸쳐 있는 실제 날짜들"을 보여주는 것.
- 범위는 이번 사이클 7일로 한정 (사용자 확정). 다음 사이클(다음 주)은 아직 미생성이므로 표시하지 않음.

## 범위

1. 오늘 페이지 상단에 "주간 스트립" 추가: 이번 사이클 7일, 각 칸에 요일+날짜, 오늘 칸 강조, 완료된 날은 체크 표시. 탭하면 하단 카드가 해당 날짜의 운동/식단으로 전환.
2. 운동/식단 카드를 인스타 포스트 느낌으로 리스타일 (헤더에 원형 아이콘 + 라벨, 모서리/여백 강화).
3. 하단 고정 아이콘 탭바로 전환 (오늘/기록/프로필), 상단 고정에서 하단 고정으로 이동.
4. 전역 톤앤매너: 포인트 컬러에 보라~핑크~오렌지 그라데이션 포인트(강조 텍스트/뱃지/활성 탭 등), 여백·폰트 웨이트 조정. 다크 테마 유지, 구조적 리레이아웃 없음.

## 아키텍처

### 신규 API: `GET /api/plan/week`

`plan/today`의 로직(프로필 조회, 사이클 계산, weekly_plans 조회/생성)을 재사용하되, `today.workout/diet` 단일 필드 대신 7일 전체를 반환:

```json
{
  "dayPointer": 12,
  "dayInWeek": 3,
  "days": [
    { "dayPointer": 10, "workout": "...", "diet": "...", "completed": true },
    { "dayPointer": 11, "workout": "...", "diet": "...", "completed": true },
    { "dayPointer": 12, "workout": "...", "diet": "...", "completed": false },
    { "dayPointer": 13, "workout": "...", "diet": "...", "completed": false },
    ...
  ]
}
```

- `completed`는 `daily_progress`에서 해당 `day_pointer`들을 조회해 채움 (`day_pointer in (...)` 한 번의 쿼리).
- 플랜 생성/재생성 로직은 `plan/today`와 동일하게 유지. 코드 중복을 피하기 위해 공통 로직(프로필 조회 → effectiveAnchor/week 계산 → weekly_plans 조회 또는 생성)을 `lib/planGenerator.ts` 또는 신규 `lib/weekPlan.ts`로 추출하고, 기존 `plan/today`도 이를 사용하도록 리팩터링.
- 기존 `/api/plan/today` 엔드포인트는 그대로 유지 (다른 곳에서 참조 안 하면 오늘 페이지가 `/api/plan/week`만 쓰도록 교체 가능 — 구현 계획 단계에서 결정).

### 오늘 페이지 (today/page.tsx)

- `/api/plan/week` 호출로 7일 데이터 받음.
- `selectedIndex` state, 기본값은 오늘(`dayInWeek - 1`).
- 상단에 `<WeekStrip days={...} selectedIndex selectedDay onSelect />` 컴포넌트 추가 (신규 `app/components/WeekStrip.tsx`).
  - 각 칸: 요일(월/화/수...), 날짜 숫자, 오늘 표시(고리/강조), 완료 시 체크 아이콘. 미래 날짜는 흐리게(dimmed) 처리하되 탭 가능(내용 미리보기).
- 하단 카드 2개(운동/식단)는 `selectedIndex`가 가리키는 날짜 데이터로 렌더링.
- "오늘 완료" 버튼은 `selectedIndex`가 실제 오늘일 때만 노출 (다른 날짜 조회 중엔 숨김).

### 하단 탭바 (TopTabs.tsx → BottomTabs.tsx로 개명, 또는 파일 유지하고 내용만 변경)

- CSS로 상단 고정 → 하단 고정(`position: fixed; bottom: 0`)으로 변경.
- 텍스트 라벨 → 아이콘(SVG 인라인, 라이브러리 추가 안 함) + 작은 라벨로 변경.
- `page` 클래스의 하단 패딩을 탭바 높이만큼 확보(현재도 80px 패딩 있음 — 값 재확인 후 조정).

### 스타일 (globals.css)

- `.card` → 인스타 포스트 카드 느낌: 상단에 원형 아이콘+라벨 "헤더 행" 추가할 수 있는 `.post-card-header` 클래스 신설, 모서리 반경/그림자 소폭 강화.
- 그라데이션: `--gradient-accent: linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)` 신설. 활성 탭 아이콘, 뱃지, 강조 텍스트 등에 `background: var(--gradient-accent)` + `background-clip: text` 또는 보더에 적용.
- 여백/폰트: `.page` 패딩, `.card-title`/`.page-title` 폰트 웨이트 소폭 조정.
- 다크 배경(`--bg`, `--surface`) 유지, 라이트 전환 없음.

## 컴포넌트 목록

- `app/components/WeekStrip.tsx` (신규) — props: `days: {date: string, label: string, completed: boolean, isToday: boolean}[]`, `selectedIndex`, `onSelect(index)`. 날짜/요일 계산(순수 함수)은 별도 `lib/weekStrip.ts`에 두어 단위 테스트 가능하게.
- `app/components/BottomTabs.tsx` (TopTabs.tsx 대체) — 아이콘 3개 인라인 SVG.
- `lib/weekPlan.ts` (신규) — `plan/today`와 `plan/week`가 공유하는 플랜 조회/생성 로직.

## 에러 처리

- `/api/plan/week` 실패 시 오늘 페이지는 기존과 동일하게 에러 메시지 + 프로필 링크 표시 (스트립 없이).
- 스트립에서 미래 날짜 탭 시에도 실패할 일 없음 (이미 받은 데이터 내 인덱싱만 함, 별도 fetch 없음).

## 테스트

- `lib/weekStrip.ts`의 날짜 계산 함수: dayInWeek/dayPointer로부터 7일 각각의 실제 Date, 요일 라벨을 올바르게 산출하는지 유닛 테스트.
- `lib/weekPlan.ts` 추출 후 기존 `plan/today` 동작 회귀 없는지 확인 (기존 로직 그대로 이동).
- 브라우저 수동 확인: 오늘 페이지 스트립 렌더링, 날짜 탭 전환, 하단 탭바 동작, 다크 테마에서 그라데이션 가독성.

## 명시적 비범위(Out of scope)

- 다음 사이클(다음 주) 이후 미래 계획 표시 — 데이터 없음.
- 프로필/로그인/회원가입 페이지의 구조 변경 — 톤앤매너(색/폰트/여백) CSS만 상속, 레이아웃 변경 없음.
- 실제 이미지 업로드, 스토리 기능 등 인스타그램의 실제 소셜 기능 — "느낌"만 차용, 기능 추가 아님.
