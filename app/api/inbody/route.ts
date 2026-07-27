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
