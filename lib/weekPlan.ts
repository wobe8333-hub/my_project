import type { SupabaseClient } from '@supabase/supabase-js'
import { getProfile } from './profile'
import { generateWeeklyPlan, type WeeklyPlan } from './planGenerator'
import { shouldRegeneratePlan, getCurrentWeekAndDay } from './dayPointer'

export class ProfileMissingError extends Error {}

export interface WeeklyPlanResult {
  dayPointer: number
  dayInWeek: number
  plan: WeeklyPlan
}

export async function getOrCreateWeeklyPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<WeeklyPlanResult> {
  const profile = await getProfile(supabase, userId)
  if (!profile) {
    throw new ProfileMissingError('프로필을 먼저 입력해주세요')
  }

  const { data: equipmentRow } = await supabase
    .from('gym_equipment')
    .select('equipment')
    .eq('user_id', userId)
    .maybeSingle()

  const now = new Date()
  const lastProgressAt = profile.last_progress_at ? new Date(profile.last_progress_at) : null
  const needsRegeneration = shouldRegeneratePlan(lastProgressAt, now)

  const weekAnchorPointer = profile.week_anchor_pointer ?? 1
  // A gap-triggered regeneration restarts the week-numbering cycle from today,
  // without touching the cumulative day_pointer itself.
  const effectiveAnchor = needsRegeneration ? profile.day_pointer : weekAnchorPointer

  const { weekNumber, dayInWeek } = getCurrentWeekAndDay(profile.day_pointer, effectiveAnchor)

  const { data: existingPlan } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_anchor_pointer', effectiveAnchor)
    .eq('week_number', weekNumber)
    .maybeSingle()

  let plan = existingPlan?.plan as WeeklyPlan | undefined

  if (!plan || needsRegeneration) {
    let adherenceNote: string | undefined
    if (needsRegeneration) {
      const { count } = await supabase
        .from('daily_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      adherenceNote = `총 ${count ?? 0}일 완료함, 최근 3일 이상 공백 발생`
    } else if (weekNumber > 1) {
      const prevWeekStart = effectiveAnchor + (weekNumber - 2) * 7
      const prevWeekEnd = effectiveAnchor + (weekNumber - 1) * 7 - 1
      const { count } = await supabase
        .from('daily_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('day_pointer', prevWeekStart)
        .lte('day_pointer', prevWeekEnd)
      adherenceNote = `지난주 7일 중 ${count ?? 0}일 완료함`
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

    const { error: upsertError } = await supabase.from('weekly_plans').upsert(
      {
        user_id: userId,
        week_anchor_pointer: effectiveAnchor,
        week_number: weekNumber,
        plan: generated,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_anchor_pointer,week_number' }
    )
    if (upsertError) {
      throw new Error('주간 계획 저장에 실패했습니다: ' + upsertError.message)
    }

    if (needsRegeneration) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          last_progress_at: now.toISOString(),
          week_anchor_pointer: profile.day_pointer,
        })
        .eq('user_id', userId)
      if (profileUpdateError) {
        throw new Error('프로필 갱신에 실패했습니다: ' + profileUpdateError.message)
      }
    }

    plan = generated
  }

  return { dayPointer: profile.day_pointer, dayInWeek, plan }
}
