# 초개인화 헬스 트레이닝

Next.js + Supabase + OpenRouter 기반의 AI 맞춤형 운동/식단 코칭 앱입니다.

## 필요한 환경 변수

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값들을 채워주세요 (값 자체는 아래에 없으니 각자 발급받아야 합니다).

| 변수명 | 어디서 받나요 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 대시보드 → 프로젝트 → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 대시보드 → 프로젝트 → Project Settings → API (anon/public key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 대시보드 → 프로젝트 → Project Settings → API (service_role key, 서버 전용) |
| `OPENROUTER_API_KEY` | https://openrouter.ai → 로그인 후 API Keys 메뉴 |
| `OPENROUTER_TEXT_MODEL` | (선택) 텍스트 생성에 쓸 OpenRouter 모델 이름, 미설정 시 기본값 사용 |
| `OPENROUTER_VISION_MODEL` | (선택) 인바디 사진 분석에 쓸 OpenRouter 비전 모델 이름, 미설정 시 기본값 사용 |

## 로컬에서 실행하기

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 열면 됩니다.

## 배포 관련 안내

현재 GitHub ↔ Vercel 자동 연동(git push 시 자동 배포)이 설정되어 있지 않습니다. 배포가 필요하면 Vercel 대시보드 또는 Vercel CLI를 통해 수동으로 재배포해야 합니다. GitHub 저장소와 Vercel 프로젝트를 연동하면 이후에는 push만으로 자동 배포되도록 개선할 수 있습니다.
