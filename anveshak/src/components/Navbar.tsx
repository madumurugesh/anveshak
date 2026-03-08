'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import Cookies from 'js-cookie'

const navLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Analytics', href: '/analytics/scheme' },
  { label: 'Schemes', href: '/schemes/registry' },
  { label: 'Geo', href: '/geo/hotspot-map' },
]

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch {
      // continue logout even if Amplify fails
    }
    Cookies.remove('accessToken')
    router.push('/login')
  }

  const userEmail = typeof window !== 'undefined' ? Cookies.get('userEmail') : ''
  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'AK'

  return (
    <>
      <style>{`
        .top-bar {
          background: var(--green-900);
          border-bottom: 1px solid var(--green-800);
          padding: 0 20px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 40;
        }
        .top-bar-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .brand-icon {
          width: 26px;
          height: 26px;
          background: var(--green-600);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-name {
          font-size: 13px;
          font-weight: 600;
          color: white;
          letter-spacing: -0.01em;
        }
        .brand-sub {
          font-size: 10px;
          color: var(--green-400);
          font-weight: 400;
        }
        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .nav-pill {
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 500;
          border-radius: 5px;
          color: var(--green-300);
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: none;
          background: transparent;
          border: none;
        }
        .nav-pill:hover, .nav-pill.active {
          background: var(--green-800);
          color: white;
        }
        .nav-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--green-600);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          border: none;
          transition: background 0.15s;
        }
        .nav-avatar:hover {
          background: var(--green-500);
        }
        @media (max-width: 640px) {
          .top-bar-nav-pills { display: none; }
        }
      `}</style>

      <nav className="top-bar">
        <Link href="/dashboard" className="top-bar-brand">
          <div className="brand-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div className="brand-name">WelfareWatch</div>
            <div className="brand-sub">Government Monitoring Platform</div>
          </div>
        </Link>

        <div className="top-bar-right">
          <div className="top-bar-nav-pills" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {navLinks.map((link) => {
              const parentPath = '/' + link.href.split('/')[1]
              const isActive = pathname === link.href || pathname.startsWith(parentPath + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-pill${isActive ? ' active' : ''}`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
          <div style={{ width: 1, height: 18, background: 'var(--green-700)', margin: '0 4px' }} />
          <button className="nav-avatar" onClick={handleLogout} title="Sign out">
            {initials}
          </button>
        </div>
      </nav>
    </>
  )
}