import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getProfile, upsertProfile, type ProfileInput } from '@/lib/profile'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const profile = await getProfile(supabase, userData.user.id)
  return NextResponse.json({ profile })
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  let input: ProfileInput
  try {
    input = (await request.json()) as ProfileInput
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 })
  }

  try {
    await upsertProfile(supabase, userData.user.id, input)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
