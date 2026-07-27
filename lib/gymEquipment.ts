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
