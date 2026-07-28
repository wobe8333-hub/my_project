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

    const weekStartPointer = dayPointer - dayInWeek + 1
    const weekEndPointer = weekStartPointer + 6

    const { data: progress, error: progressError } = await supabase
      .from('daily_progress')
      .select('day_pointer')
      .eq('user_id', userId)
      .gte('day_pointer', weekStartPointer)
      .lte('day_pointer', weekEndPointer)

    if (progressError) {
      throw new Error('완료 기록 조회에 실패했습니다: ' + progressError.message)
    }

    const completedPointers = new Set((progress ?? []).map((p) => p.day_pointer))

    const days = plan.days.map((d, i) => ({
      dayPointer: weekStartPointer + i,
      workout: d.workout,
      diet: d.diet,
      completed: completedPointers.has(weekStartPointer + i),
    }))

    return NextResponse.json({ dayPointer, dayInWeek, days })
  } catch (err) {
    if (err instanceof ProfileMissingError) {
      return NextResponse.json({ error: err.message, needsProfile: true }, { status: 400 })
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
