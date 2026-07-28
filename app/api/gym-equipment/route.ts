import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { data, error } = await supabase
    .from('gym_equipment')
    .select('equipment')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ equipment: data?.equipment ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  let body: { equipment?: unknown }
  try {
    body = (await request.json()) as { equipment?: unknown }
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 })
  }

  const { equipment } = body
  if (!Array.isArray(equipment) || !equipment.every((item) => typeof item === 'string')) {
    return NextResponse.json({ error: 'equipment는 문자열 배열이어야 합니다' }, { status: 400 })
  }

  const { error } = await supabase.from('gym_equipment').upsert({
    user_id: userData.user.id,
    equipment,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
