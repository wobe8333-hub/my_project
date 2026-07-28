'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSubmitting(false)
    if (error) {
      setError('요청에 실패했습니다: ' + error.message)
      return
    }
    setSent(true)
  }

  return (
    <main className="page auth-page">
      <h1 className="auth-logo">Personal Training</h1>

      {sent ? (
        <p className="text-secondary" style={{ textAlign: 'center' }}>
          비밀번호 재설정 링크를 이메일로 보냈습니다. 메일함을 확인해주세요.
        </p>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          <p className="text-secondary">가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.</p>
          <input
            className="input"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? '전송 중...' : '재설정 링크 보내기'}
          </button>
        </form>
      )}

      {error && <p className="text-error">{error}</p>}
      <p className="text-secondary" style={{ textAlign: 'center' }}>
        <a className="text-link" href="/login">로그인으로 돌아가기</a>
      </p>
    </main>
  )
}
