import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { data: videos, error } = await supabase
    .from('exercise_videos')
    .select('id, category, name, youtube_url, sort_order')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const grouped = new Map<string, { id: string; name: string; youtube_url: string }[]>()
  for (const v of videos ?? []) {
    const list = grouped.get(v.category) ?? []
    list.push({ id: v.id, name: v.name, youtube_url: v.youtube_url })
    grouped.set(v.category, list)
  }

  const categories = Array.from(grouped.entries()).map(([category, items]) => ({ category, items }))

  return NextResponse.json({ categories })
}
