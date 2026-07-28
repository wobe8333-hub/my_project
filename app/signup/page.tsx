'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError('가입에 실패했습니다: ' + error.message)
      return
    }
    router.push('/login')
  }

  return (
    <main className="page">
      <h1 className="page-title">회원가입</h1>
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
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button className="btn btn-primary" type="submit">가입하기</button>
      </form>
      {error && <p className="text-error">{error}</p>}
    </main>
  )
}
