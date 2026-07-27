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
