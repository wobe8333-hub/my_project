'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/today', label: '오늘' },
  { href: '/history', label: '기록' },
  { href: '/videos', label: '운동법' },
  { href: '/profile', label: '프로필' },
]

export default function TopTabs() {
  const pathname = usePathname()

  return (
    <nav className="top-tabs">
      <div className="top-tabs-inner">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`top-tab${pathname === tab.href ? ' top-tab-active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
