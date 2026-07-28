'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const supabase = createBrowserSupabase()
      const { data } = await supabase.auth.getSession()
      setHasSession(!!data.session)
    }
    checkSession()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('비밀번호 변경에 실패했습니다: ' + error.message)
      setSubmitting(false)
      return
    }
    router.push('/login')
  }

  if (hasSession === null) {
    return (
      <main className="page auth-page">
        <p className="text-secondary">확인 중...</p>
      </main>
    )
  }

  if (!hasSession) {
    return (
      <main className="page auth-page">
        <h1 className="auth-logo">Personal Training</h1>
        <p className="text-error">유효하지 않거나 만료된 링크입니다.</p>
        <p className="text-secondary" style={{ textAlign: 'center' }}>
          <a className="text-link" href="/forgot-password">비밀번호 찾기 다시 요청하기</a>
        </p>
      </main>
    )
  }

  return (
    <main className="page auth-page">
      <h1 className="auth-logo">Personal Training</h1>
      <form className="stack" onSubmit={handleSubmit}>
        <input
          className="input"
          type="password"
          placeholder="새 비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
      {error && <p className="text-error">{error}</p>}
    </main>
  )
}
