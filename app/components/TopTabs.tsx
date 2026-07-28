'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, History, User } from 'lucide-react'

const TABS = [
  { href: '/today', label: '오늘', Icon: Calendar },
  { href: '/history', label: '기록', Icon: History },
  { href: '/profile', label: '프로필', Icon: User },
]

export default function TopTabs() {
  const pathname = usePathname()

  return (
    <>
      <nav className="bottom-tabs">
        <div className="bottom-tabs-inner">
          {TABS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`bottom-tab${pathname === href ? ' bottom-tab-active' : ''}`}
            >
              <Icon size={24} strokeWidth={2} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <nav className="sidebar-nav">
        {TABS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-nav-link${pathname === href ? ' sidebar-nav-link-active' : ''}`}
          >
            <Icon size={20} strokeWidth={2} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
