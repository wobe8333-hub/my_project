import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { lookupGymEquipment } from '@/lib/gymEquipment'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { gymName } = await request.json()
  if (!gymName) return NextResponse.json({ error: '헬스장 이름이 필요합니다' }, { status: 400 })

  const equipment = await lookupGymEquipment(gymName)
  return NextResponse.json({ equipment })
}
