'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('로그인에 실패했습니다: ' + error.message)
      setSubmitting(false)
      return
    }
    router.push('/today')
    router.refresh()
  }

  return (
    <main className="page auth-page">
      <h1 className="auth-logo">Personal Training</h1>
      <form className="stack" onSubmit={handleSubmit}>
        <input
          className="input"
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="auth-row-end">
          <a className="text-link" href="/forgot-password">비밀번호를 잊으셨나요?</a>
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? '로그인 중...' : '로그인'}
        </button>
      </form>
      {error && <p className="text-error">{error}</p>}
      <hr className="divider" />
      <p className="text-secondary" style={{ textAlign: 'center' }}>
        아직 계정이 없으신가요? <a className="text-link" href="/signup">회원가입</a>
      </p>
    </main>
  )
}
