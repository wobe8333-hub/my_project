import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProfileInput {
  heightCm: number
  weightKg: number
  bodyFatPct?: number
  muscleMassKg?: number
  age: number
  gender: 'male' | 'female'
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  weeklyDays: number
  sessionMinutes: number
  goal?: 'cut' | 'bulk' | 'maintain'
  environment: 'gym' | 'home'
  gymName?: string
  allergies: string[]
}

const REQUIRED_KEYS: (keyof ProfileInput)[] = [
  'heightCm',
  'weightKg',
  'age',
  'gender',
  'experienceLevel',
  'weeklyDays',
  'sessionMinutes',
  'environment',
]

export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ProfileInput
) {
  const missing = REQUIRED_KEYS.filter((key) => input[key] === undefined || input[key] === null)
  if (missing.length > 0) {
    throw new Error('필수 입력값이 누락되었습니다: ' + missing.join(', '))
  }

  const { error } = await supabase.from('profiles').upsert({
    user_id: userId,
    height_cm: input.heightCm,
    weight_kg: input.weightKg,
    body_fat_pct: input.bodyFatPct ?? null,
    muscle_mass_kg: input.muscleMassKg ?? null,
    age: input.age,
    gender: input.gender,
    experience_level: input.experienceLevel,
    weekly_days: input.weeklyDays,
    session_minutes: input.sessionMinutes,
    goal: input.goal ?? null,
    environment: input.environment,
    gym_name: input.gymName ?? null,
    allergies: input.allergies,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) throw new Error('프로필 저장에 실패했습니다: ' + error.message)

  if (input.bodyFatPct != null || input.muscleMassKg != null) {
    await supabase.from('inbody_history').insert({
      user_id: userId,
      body_fat_pct: input.bodyFatPct ?? null,
      muscle_mass_kg: input.muscleMassKg ?? null,
    })
  }
}

export async function getInbodyHistory(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('inbody_history')
    .select('body_fat_pct, muscle_mass_kg, recorded_at')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: true })

  if (error) throw new Error('인바디 기록 조회에 실패했습니다: ' + error.message)
  return data ?? []
}

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error('프로필 조회에 실패했습니다: ' + error.message)
  return data
}
