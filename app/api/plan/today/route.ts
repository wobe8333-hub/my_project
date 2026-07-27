import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { generateWeeklyPlan } from '@/lib/planGenerator'
import { shouldRegeneratePlan, getCurrentWeekAndDay } from '@/lib/dayPointer'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  const userId = userData.user.id

  const profile = await getProfile(supabase, userId)
  if (!profile) {
    return NextResponse.json({ error: '프로필을 먼저 입력해주세요', needsProfile: true }, { status: 400 })
  }

  const { data: equipmentRow } = await supabase
    .from('gym_equipment')
    .select('equipment')
    .eq('user_id', userId)
    .maybeSingle()

  const now = new Date()
  const lastProgressAt = profile.last_progress_at ? new Date(profile.last_progress_at) : null
  const needsRegeneration = shouldRegeneratePlan(lastProgressAt, now)

  const { weekNumber, dayInWeek } = getCurrentWeekAndDay(profile.day_pointer)

  const { data: existingPlan } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_number', weekNumber)
    .maybeSingle()

  let plan = existingPlan?.plan as { days: { workout: string; diet: string }[] } | undefined

  if (!plan || needsRegeneration) {
    let adherenceNote: string | undefined
    if (needsRegeneration) {
      const { count } = await supabase
        .from('daily_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      adherenceNote = `총 ${count ?? 0}일 완료함, 최근 3일 이상 공백 발생`
    }

    const generated = await generateWeeklyPlan(
      {
        heightCm: profile.height_cm,
        weightKg: profile.weight_kg,
        age: profile.age,
        gender: profile.gender,
        experienceLevel: profile.experience_level,
        weeklyDays: profile.weekly_days,
        sessionMinutes: profile.session_minutes,
        goal: profile.goal ?? undefined,
        environment: profile.environment,
        allergies: profile.allergies ?? [],
      },
      equipmentRow?.equipment ?? [],
      adherenceNote
    )

    await supabase.from('weekly_plans').upsert(
      {
        user_id: userId,
        week_number: weekNumber,
        plan: generated,
      },
      { onConflict: 'user_id,week_number' }
    )

    if (needsRegeneration) {
      await supabase
        .from('profiles')
        .update({ last_progress_at: now.toISOString() })
        .eq('user_id', userId)
    }

    plan = generated
  }

  return NextResponse.json({
    dayPointer: profile.day_pointer,
    dayInWeek,
    today: plan.days[dayInWeek - 1],
  })
}
