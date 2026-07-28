import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getInbodyHistory } from '@/lib/profile'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const history = await getInbodyHistory(supabase, userData.user.id)
  return NextResponse.json({ history })
}
