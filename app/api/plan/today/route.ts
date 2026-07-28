import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getOrCreateWeeklyPlan, ProfileMissingError } from '@/lib/weekPlan'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  const userId = userData.user.id

  try {
    const { dayPointer, dayInWeek, plan } = await getOrCreateWeeklyPlan(supabase, userId)
    return NextResponse.json({
      dayPointer,
      dayInWeek,
      today: plan.days[dayInWeek - 1],
    })
  } catch (err) {
    if (err instanceof ProfileMissingError) {
      return NextResponse.json({ error: err.message, needsProfile: true }, { status: 400 })
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
