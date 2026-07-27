'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [form, setForm] = useState({
    heightCm: '',
    weightKg: '',
    bodyFatPct: '',
    muscleMassKg: '',
    age: '',
    gender: 'male',
    experienceLevel: 'beginner',
    weeklyDays: '3',
    sessionMinutes: '60',
    goal: '',
    environment: 'home',
    gymName: '',
    allergies: '',
  })
  const [message, setMessage] = useState<string | null>(null)
  const [equipmentList, setEquipmentList] = useState<string[]>([])
  const [checkedEquipment, setCheckedEquipment] = useState<string[]>([])
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        bodyFatPct: form.bodyFatPct ? Number(form.bodyFatPct) : undefined,
        muscleMassKg: form.muscleMassKg ? Number(form.muscleMassKg) : undefined,
        age: Number(form.age),
        gender: form.gender,
        experienceLevel: form.experienceLevel,
        weeklyDays: Number(form.weeklyDays),
        sessionMinutes: Number(form.sessionMinutes),
        goal: form.goal || undefined,
        environment: form.environment,
        gymName: form.gymName || undefined,
        allergies: form.allergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    })
    if (res.ok) {
      await fetch('/api/gym-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment: checkedEquipment }),
      })
      setMessage('저장되었습니다.')
      router.push('/today')
    } else {
      const data = await res.json()
      setMessage('오류: ' + data.error)
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1>프로필 입력</h1>
      <form onSubmit={handleSubmit}>
        <label>키(cm) <input value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} required /></label>
        <label>몸무게(kg) <input value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} required /></label>
        <label>나이 <input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required /></label>
        <label>
          인바디 사진 업로드 (선택)
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = async () => {
                try {
                  const res = await fetch('/api/inbody', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: reader.result }),
                  })
                  if (res.ok) {
                    const data = await res.json()
                    setForm((prev) => ({
                      ...prev,
                      bodyFatPct: data.bodyFatPct != null ? String(data.bodyFatPct) : prev.bodyFatPct,
                      muscleMassKg: data.muscleMassKg != null ? String(data.muscleMassKg) : prev.muscleMassKg,
                    }))
                    setMessage(
                      data.bodyFatPct != null
                        ? '인바디 사진에서 값을 읽었습니다. 확인 후 저장하세요.'
                        : '사진에서 값을 정확히 읽지 못했습니다. 직접 입력해주세요.'
                    )
                  } else {
                    setMessage('사진 분석에 실패했습니다. 직접 입력해주세요.')
                  }
                } catch {
                  setMessage('사진 분석 중 오류가 발생했습니다. 직접 입력해주세요.')
                }
              }
              reader.readAsDataURL(file)
            }}
          />
        </label>
        <label>체지방률(%) <input value={form.bodyFatPct} onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })} /></label>
        <label>골격근량(kg) <input value={form.muscleMassKg} onChange={(e) => setForm({ ...form, muscleMassKg: e.target.value })} /></label>
        <label>성별
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </label>
        <label>운동 경력
          <select value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}>
            <option value="beginner">초보</option>
            <option value="intermediate">중급</option>
            <option value="advanced">고급</option>
          </select>
        </label>
        <label>주당 가능 일수 <input value={form.weeklyDays} onChange={(e) => setForm({ ...form, weeklyDays: e.target.value })} required /></label>
        <label>1회 가능 시간(분) <input value={form.sessionMinutes} onChange={(e) => setForm({ ...form, sessionMinutes: e.target.value })} required /></label>
        <label>목표
          <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
            <option value="">AI에게 맡기기</option>
            <option value="cut">감량</option>
            <option value="bulk">근육증가</option>
            <option value="maintain">유지</option>
          </select>
        </label>
        <label>운동 환경
          <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
            <option value="home">홈트레이닝</option>
            <option value="gym">헬스장</option>
          </select>
        </label>
        {form.environment === 'gym' && (
          <>
            <label>헬스장 이름 <input value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} /></label>
            <button
              type="button"
              onClick={async () => {
                setMessage('헬스장 정보를 검색하고 있습니다...')
                const res = await fetch('/api/gym-equipment/lookup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ gymName: form.gymName }),
                })
                const data = await res.json()
                setEquipmentList(data.equipment ?? [])
                setCheckedEquipment(data.equipment ?? [])
                setMessage(
                  data.equipment?.length
                    ? '기구 목록을 찾았습니다. 확인 후 수정하세요.'
                    : '자동으로 찾지 못했습니다. 직접 체크해주세요.'
                )
              }}
            >
              기구 자동 조회
            </button>
            {['덤벨', '바벨', '스미스머신', '렛풀다운', '레그프레스', '케틀벨', '러닝머신', '벤치프레스'].map(
              (item) => (
                <label key={item} style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={checkedEquipment.includes(item)}
                    onChange={(e) => {
                      setCheckedEquipment((prev) =>
                        e.target.checked ? [...prev, item] : prev.filter((x) => x !== item)
                      )
                    }}
                  />
                  {item}
                </label>
              )
            )}
          </>
        )}
        <label>음식 알레르기/기피 (쉼표로 구분) <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></label>
        <button type="submit">저장</button>
      </form>
      {message && <p>{message}</p>}
    </main>
  )
}
