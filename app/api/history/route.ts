import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { data: progress, error } = await supabase
    .from('daily_progress')
    .select('day_pointer, completed_at')
    .eq('user_id', userData.user.id)
    .order('day_pointer', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('day_pointer, created_at')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const daysSinceSignup = profile?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / MS_PER_DAY) + 1)
    : 1

  return NextResponse.json({
    completedDays: progress ?? [],
    currentDayPointer: profile?.day_pointer ?? 1,
    daysSinceSignup,
  })
}
