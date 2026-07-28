'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Ruler, Weight, Search } from 'lucide-react'
import TopTabs from '@/app/components/TopTabs'

const FIXED_EQUIPMENT = ['덤벨', '바벨', '스미스머신', '렛풀다운', '레그프레스', '케틀벨', '러닝머신', '벤치프레스']

const EMPTY_FORM = {
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
}

interface InbodyHistoryEntry {
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  recorded_at: string
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p className="sparkline-empty">기록이 쌓이면 변화 추이가 표시됩니다.</p>
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = 30 - ((v - min) / range) * 28
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox="0 0 100 30" width="100%" height="40" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#ec4899" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function ProfilePage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [message, setMessage] = useState<string | null>(null)
  const [equipmentList, setEquipmentList] = useState<string[]>([])
  const [checkedEquipment, setCheckedEquipment] = useState<string[]>([])
  const [hydrating, setHydrating] = useState(true)
  const [hydrationError, setHydrationError] = useState<string | null>(null)
  const [inbodyHistory, setInbodyHistory] = useState<InbodyHistoryEntry[]>([])
  const router = useRouter()

  useEffect(() => {
    async function hydrate() {
      try {
        const [profileRes, equipmentRes, historyRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/gym-equipment'),
          fetch('/api/inbody-history'),
        ])

        if (!profileRes.ok || !equipmentRes.ok) {
          throw new Error('기존 정보를 불러오지 못했습니다.')
        }

        const { profile } = await profileRes.json()
        if (profile) {
          setForm({
            heightCm: profile.height_cm != null ? String(profile.height_cm) : '',
            weightKg: profile.weight_kg != null ? String(profile.weight_kg) : '',
            bodyFatPct: profile.body_fat_pct != null ? String(profile.body_fat_pct) : '',
            muscleMassKg: profile.muscle_mass_kg != null ? String(profile.muscle_mass_kg) : '',
            age: profile.age != null ? String(profile.age) : '',
            gender: profile.gender ?? 'male',
            experienceLevel: profile.experience_level ?? 'beginner',
            weeklyDays: profile.weekly_days != null ? String(profile.weekly_days) : '3',
            sessionMinutes: profile.session_minutes != null ? String(profile.session_minutes) : '60',
            goal: profile.goal ?? '',
            environment: profile.environment ?? 'home',
            gymName: profile.gym_name ?? '',
            allergies: Array.isArray(profile.allergies) ? profile.allergies.join(', ') : '',
          })
        }

        const { equipment } = await equipmentRes.json()
        if (Array.isArray(equipment) && equipment.length > 0) {
          setEquipmentList(equipment)
          setCheckedEquipment(equipment)
        }

        if (historyRes.ok) {
          const { history } = await historyRes.json()
          setInbodyHistory(history ?? [])
        }
      } catch {
        setHydrationError(
          '기존 프로필 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.'
        )
      } finally {
        setHydrating(false)
      }
    }
    hydrate()
  }, [])

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

  if (hydrating) {
    return (
      <>
        <TopTabs />
        <main className="page"><p className="text-secondary">불러오는 중...</p></main>
      </>
    )
  }

  if (hydrationError) {
    return (
      <>
        <TopTabs />
        <main className="page">
          <p className="text-error">{hydrationError}</p>
          <button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>
            다시 시도
          </button>
        </main>
      </>
    )
  }

  const equipmentChecklist = Array.from(new Set([...FIXED_EQUIPMENT, ...equipmentList]))
  const bodyFatSeries = inbodyHistory.map((h) => h.body_fat_pct).filter((v): v is number => v != null)
  const muscleSeries = inbodyHistory.map((h) => h.muscle_mass_kg).filter((v): v is number => v != null)

  return (
    <>
      <TopTabs />
      <main className="page">
        <div className="profile-header">
          <div className="profile-avatar">
            <User size={32} />
          </div>
          <div className="profile-header-stats">
            <div className="profile-header-stat">
              <span className="profile-header-stat-value">{form.heightCm || '-'}</span>
              <span className="profile-header-stat-label">키(cm)</span>
            </div>
            <div className="profile-header-stat">
              <span className="profile-header-stat-value">{form.weightKg || '-'}</span>
              <span className="profile-header-stat-label">몸무게(kg)</span>
            </div>
            <div className="profile-header-stat">
              <span className="profile-header-stat-value">{form.age || '-'}</span>
              <span className="profile-header-stat-label">나이</span>
            </div>
          </div>
        </div>

        {(bodyFatSeries.length > 0 || muscleSeries.length > 0) && (
          <div className="post-card">
            <div className="post-card-header">
              <span className="post-card-label">인바디 변화 추이</span>
            </div>
            <div className="post-card-body sparkline-wrap">
              <span className="text-secondary">체지방률</span>
              <Sparkline values={bodyFatSeries} />
              <span className="text-secondary">골격근량</span>
              <Sparkline values={muscleSeries} />
            </div>
          </div>
        )}

      <form className="stack" onSubmit={handleSubmit}>
        <div className="profile-grid">
          <div className="stack">
            <div className="field">
              <label className="field-label"><Ruler size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />키 (cm)</label>
              <input className="input" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} required />
            </div>
            <div className="field">
              <label className="field-label"><Weight size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />몸무게 (kg)</label>
              <input className="input" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} required />
            </div>
            <div className="field">
              <label className="field-label">나이</label>
              <input className="input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required />
            </div>

            <div className="field">
              <label className="field-label">인바디 사진 업로드 (선택)</label>
              <input
                className="input"
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
            </div>
            <div className="field">
              <label className="field-label">체지방률 (%)</label>
              <input className="input" value={form.bodyFatPct} onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label">골격근량 (kg)</label>
              <input className="input" value={form.muscleMassKg} onChange={(e) => setForm({ ...form, muscleMassKg: e.target.value })} />
            </div>
          </div>

          <div className="stack">
            <div className="field">
              <label className="field-label">성별</label>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">운동 경력</label>
              <select className="input" value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}>
                <option value="beginner">초보</option>
                <option value="intermediate">중급</option>
                <option value="advanced">고급</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">주당 가능 일수</label>
              <input className="input" value={form.weeklyDays} onChange={(e) => setForm({ ...form, weeklyDays: e.target.value })} required />
            </div>
            <div className="field">
              <label className="field-label">1회 가능 시간 (분)</label>
              <input className="input" value={form.sessionMinutes} onChange={(e) => setForm({ ...form, sessionMinutes: e.target.value })} required />
            </div>
            <div className="field">
              <label className="field-label">목표</label>
              <select className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                <option value="">AI에게 맡기기</option>
                <option value="cut">감량</option>
                <option value="bulk">근육증가</option>
                <option value="maintain">유지</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">운동 환경</label>
              <select className="input" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
                <option value="home">홈트레이닝</option>
                <option value="gym">헬스장</option>
              </select>
            </div>

            {form.environment === 'gym' && (
              <div className="card">
                <div className="field">
                  <label className="field-label">헬스장 이름</label>
                  <input className="input" value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />
                </div>
                <button
                  className="btn btn-secondary"
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
                  <Search size={16} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                  기구 자동 조회
                </button>
                <div>
                  {equipmentChecklist.map((item) => (
                    <label className="checkbox-row" key={item}>
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
                  ))}
                </div>
              </div>
            )}

            <div className="field">
              <label className="field-label">음식 알레르기/기피 (쉼표로 구분)</label>
              <input className="input" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="sticky-actions">
          <button className="btn btn-primary" type="submit">저장</button>
        </div>
      </form>
      {message && <p className="text-secondary">{message}</p>}
      </main>
    </>
  )
}
