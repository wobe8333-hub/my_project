'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/today',
    label: '오늘',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: '/history',
    label: '기록',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: '프로필',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
]

export default function TopTabs() {
  const pathname = usePathname()

  return (
    <nav className="bottom-tabs">
      <div className="bottom-tabs-inner">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`bottom-tab${pathname === tab.href ? ' bottom-tab-active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
