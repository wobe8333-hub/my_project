import type { ProfileInput } from './profile'
import { computeWorkoutDayFlags } from './workoutSchedule'

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

  const dayFlags = computeWorkoutDayFlags(profile.weeklyDays)
  const daySchedule = dayFlags.map((isWorkout, i) => `${i + 1}일차: ${isWorkout ? '운동일' : '휴식일'}`).join(', ')

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

[운동 설계 원칙 - 근거 기반 지침, 반드시 준수]
- 각 근육군은 주 2회 이상, 비연속일로 분산해서 훈련하세요.
- 근성장이 목표면 근육군당 주 10~20세트, 세트당 8~12회, 70~85% 1RM 강도로 요일별 배분하세요. 근력이 목표면 세트당 2~3세트, 80% 1RM 강도로 구성하세요.
- 세트간 휴식은 경력에 따라 다르게 안내하세요: 초보/중급은 1~2분, 고급은 1~3분.
- 점진과부하 원칙을 반영하세요: 무게를 2~10% 늘리거나, 횟수·세트 추가, 휴식 단축, 이센트릭 템포 늘리기, 가동범위 확대 중 하나를 매주 제안하세요. 초보는 매회, 중급은 매주, 고급은 매월 단위로 진행 속도를 조절하세요. 지난주 진행 상황이 있으면 이를 반영해 다음 단계로 넘어갈지 판단하세요.
- 홈트레이닝 환경이면 밀기/당기기/스쿼트/힌지/코어 5대 동작 패턴을 중심으로, 보유 기구가 없으면 맨몸 변형 동작으로 구성하세요.
- 아래 요일별 배정을 반드시 그대로 따르세요 (임의로 다른 날에 운동을 넣거나 빼지 마세요): ${daySchedule}
- "휴식일"로 지정된 날은 workout 필드에 정확히 "휴식"이라고만 쓰세요. "운동일"로 지정된 날에만 운동 내용을 채우세요.

[식단 설계 원칙 - 근거 기반 지침, 반드시 준수]
- 목표에 따라 몸무게(${profile.weightKg}kg) 기준 단백질 섭취량을 계산해 식단에 g 단위로 명시하세요: 벌크(근육증가)는 1.8~2.2g/kg, 유지는 1.6~1.8g/kg, 컷(감량)은 2.0~2.4g/kg.
- 컷이 목표면 하루 300~500kcal 결핍을 유지하도록 안내하는 문구를 포함하세요.

[출력 형식 - 반드시 준수]
- workoutTitle: 그날 운동의 카테고리 한 줄 (예: "유산소 + 코어 운동"). 휴식일은 "휴식"으로 쓰세요.
- workoutItems: 운동 종목 하나당 배열 원소 하나씩 "종목명 세트수x횟수" 또는 "종목명 시간" 형식으로. 휴식일은 빈 배열([])로 두세요.
- dietItems: "아침: 내용", "점심: 내용", "저녁: 내용" 순서로 정확히 3개 원소를 가진 배열로 작성하세요. 한 원소에 여러 끼니를 합치지 마세요.
- 각 배열 원소 안에는 줄바꿈 문자를 넣지 마세요.

반드시 아래 JSON 형식으로만, 정확히 7개 요소로 답하세요:
{"days": [{"workoutTitle": "1일차 운동 카테고리", "workoutItems": ["종목1 3x10", "종목2 3x10"], "dietItems": ["아침: ...", "점심: ...", "저녁: ..."]}, ... 7개]}`

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

  let parsed: any
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다.')
  }

  if (!Array.isArray(parsed.days) || parsed.days.length !== 7) {
    throw new Error('AI가 7일치 계획을 올바른 형식으로 생성하지 못했습니다.')
  }

  const days: DayPlan[] = parsed.days.map((d: any) => {
    if (
      typeof d?.workoutTitle !== 'string' ||
      !Array.isArray(d?.workoutItems) ||
      !Array.isArray(d?.dietItems)
    ) {
      throw new Error('AI가 7일치 계획을 올바른 형식으로 생성하지 못했습니다.')
    }
    const workout = d.workoutItems.length ? [d.workoutTitle, ...d.workoutItems].join('\n') : d.workoutTitle
    const diet = d.dietItems.join('\n')
    return { workout, diet }
  })

  return { days }
}
