import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  const userId = userData.user.id

  const { data: profile } = await supabase
    .from('profiles')
    .select('day_pointer')
    .eq('user_id', userId)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: '프로필이 없습니다' }, { status: 400 })

  const { error: progressError } = await supabase.from('daily_progress').insert({
    user_id: userId,
    day_pointer: profile.day_pointer,
  })
  if (progressError) {
    return NextResponse.json({ error: progressError.message }, { status: 400 })
  }

  const nextPointer = profile.day_pointer + 1
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ day_pointer: nextPointer, last_progress_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  return NextResponse.json({ ok: true, dayPointer: nextPointer })
}
