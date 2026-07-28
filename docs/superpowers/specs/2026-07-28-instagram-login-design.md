# 인스타그램 스타일 로그인 화면 + 비밀번호 찾기 설계

## 배경
`app/login/page.tsx`가 기본 폼 스타일뿐이라, 이미 앱 전반에 적용된 인스타그램 스타일 디자인 시스템(`--gradient-accent`, `.post-card` 등, [globals.css](../../../app/globals.css))과 톤이 안 맞았다. 로그인 화면을 인스타그램 로그인 화면 구조로 맞추고, 없던 비밀번호 찾기 플로우를 추가한다.

## 변경 범위
1. `app/login/page.tsx`
   - 상단에 그라데이션 텍스트 워드마크 "Personal Training" 추가 (`.bottom-tab-active span`과 동일한 그라데이션-텍스트 기법 재사용)
   - 이메일/비밀번호 입력 아래 우측 정렬 "비밀번호를 잊으셨나요?" 링크 → `/forgot-password`
   - 하단 구분선 + 가입 링크는 기존 유지
2. `app/forgot-password/page.tsx` (신규)
   - 이메일 입력 폼, `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/reset-password })` 호출
   - 성공 시 "이메일을 확인하세요" 안내로 전환 (폼 숨김)
3. `app/reset-password/page.tsx` (신규)
   - 마운트 시 `supabase.auth.getSession()`으로 리셋 링크의 세션 확인 (세션 없으면 안내 문구 + 로그인으로 이동 링크)
   - 새 비밀번호 입력 폼, `supabase.auth.updateUser({ password })` 호출 후 `/login`으로 이동
4. `middleware.ts`의 `PUBLIC_PATHS`에 `/forgot-password`, `/reset-password` 추가 (로그인 안 된 상태에서 접근해야 하는 페이지이므로)

## 스타일
새 CSS는 최소화하고 기존 클래스(`.page`, `.input`, `.btn`, `.text-link`, `.divider`, `.text-secondary`) 재사용. 그라데이션 워드마크만 새 클래스 하나(`.auth-logo`) 추가.

## 테스트
UI 페이지 위주라 자동 테스트는 스킵하고 브라우저로 직접 확인한다 (로그인 페이지 렌더, 비밀번호 찾기 이메일 발송 요청까지).

## 범위 밖
- 회원가입 페이지 디자인 변경 없음
- SNS 소셜 로그인 없음
- 이메일 발송 템플릿 커스터마이징 없음 (Supabase 기본 템플릿 사용)
