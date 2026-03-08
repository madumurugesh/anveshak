'use client'

import { useState } from 'react'
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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
    } catch {
      // continue logout even if Amplify fails
    }
    Cookies.remove('accessToken')
    Cookies.remove('userEmail')
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
          <img src="/logo.png" alt="Anveshak" width={28} height={28} style={{ borderRadius: 6 }} />
          <div>
            <div className="brand-name">Anveshak</div>
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
          <button className="nav-avatar" onClick={() => setShowLogoutConfirm(true)} title="Sign out">
            {initials}
          </button>
        </div>
      </nav>

      {/* Logout confirmation overlay */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowLogoutConfirm(false)}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '24px 28px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)', maxWidth: 340, width: '90%',
            textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Sign Out?</h3>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 1.5 }}>Are you sure you want to log out of Anveshak?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
              >Cancel</button>
              <button
                onClick={handleLogout}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#DC2626', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
              >Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}