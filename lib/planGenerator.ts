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
