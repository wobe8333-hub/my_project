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
