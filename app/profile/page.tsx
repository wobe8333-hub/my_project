'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [form, setForm] = useState({
    heightCm: '',
    weightKg: '',
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
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
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
          <label>헬스장 이름 <input value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} /></label>
        )}
        <label>음식 알레르기/기피 (쉼표로 구분) <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></label>
        <button type="submit">저장</button>
      </form>
      {message && <p>{message}</p>}
    </main>
  )
}
