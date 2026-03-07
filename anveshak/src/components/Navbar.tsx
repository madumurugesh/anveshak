'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import Cookies from 'js-cookie'

export default function Navbar() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch {
      // continue logout even if Amplify fails
    }
    Cookies.remove('accessToken')
    router.push('/login')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        /*
        ╔══════════════════════════════════════════╗
        ║           PALETTE                        ║
        ║  --bg-surface   : #F4F9F0  (page bg)     ║
        ║  --bg-navbar    : #FFFFFF  (navbar)       ║
        ║  --border       : #DFF0D6  (dividers)     ║
        ║  --green-light  : #EBF5E3  (hover/chip)   ║
        ║  --green-mid    : #7BBF4E  (accent/CTA)   ║
        ║  --green-deep   : #3E7228  (dark text)    ║
        ║  --green-bark   : #2A4E1A  (logo/strong)  ║
        ║  --text-primary : #1E3312  (headings)     ║
        ║  --text-muted   : #7A9E6A  (placeholders) ║
        ╚══════════════════════════════════════════╝
        */

        :root {
          --bg-surface:   #F4F9F0;
          --bg-navbar:    #FFFFFF;
          --border:       #DFF0D6;
          --green-light:  #EBF5E3;
          --green-mid:    #7BBF4E;
          --green-deep:   #3E7228;
          --green-bark:   #2A4E1A;
          --text-primary: #1E3312;
          --text-muted:   #7A9E6A;
        }

        .navbar-root { font-family: 'DM Sans', sans-serif; }

        .navbar-shell {
          position: sticky;
          top: 0;
          z-index: 40;
          background: var(--bg-navbar);
          border-bottom: 1.5px solid var(--border);
        }

        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 50px;
          padding: 0 20px;
          gap: 12px;
        }

        /* Logo */
        .nav-logo {
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0; text-decoration: none;
        }
        .nav-logo-mark {
          width: 28px; height: 28px;
          background: linear-gradient(135deg, var(--green-mid) 0%, var(--green-deep) 100%);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 1px 6px rgba(62,114,40,0.25);
        }
        .nav-logo-mark svg { width: 15px; height: 15px; color: #fff; }
        .nav-logo-name { font-size: 13.5px; font-weight: 700; color: var(--green-bark); letter-spacing: -0.01em; }
        .nav-logo-name span { color: var(--green-mid); }

        /* Divider */
        .nav-divider { width: 1px; height: 20px; background: var(--border); flex-shrink: 0; }

        /* Search */
        .nav-search-wrap { flex: 1; max-width: 340px; position: relative; }
        .nav-search-icon {
          position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
          width: 13px; height: 13px; color: var(--text-muted); pointer-events: none;
        }
        .nav-search-input {
          width: 100%; padding: 0 38px 0 30px; height: 33px;
          background: var(--bg-surface); border: 1.5px solid var(--border);
          border-radius: 9px; color: var(--text-primary);
          font-size: 12.5px; font-family: 'DM Sans', sans-serif; outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .nav-search-input::placeholder { color: var(--text-muted); }
        .nav-search-input:focus {
          border-color: var(--green-mid); background: #fff;
          box-shadow: 0 0 0 3px rgba(123,191,78,0.12);
        }
        .nav-search-kbd {
          position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
          font-family: 'DM Mono', monospace; font-size: 9px;
          color: var(--text-muted); background: #fff;
          border: 1px solid var(--border); border-radius: 4px; padding: 1.5px 5px;
        }

        /* Right */
        .nav-right { display: flex; align-items: center; gap: 3px; flex-shrink: 0; }

        /* Live */
        .nav-live {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 20px;
          background: var(--green-light); border: 1px solid #C8E8B0;
          margin-right: 6px;
        }
        .nav-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--green-mid); box-shadow: 0 0 0 2px rgba(123,191,78,0.3);
          animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
          0%,100% { box-shadow: 0 0 0 2px rgba(123,191,78,0.3); }
          50%      { box-shadow: 0 0 0 4px rgba(123,191,78,0.15); }
        }
        .nav-live-text {
          font-size: 10.5px; font-weight: 700; color: var(--green-deep);
          letter-spacing: 0.07em; text-transform: uppercase;
        }

        /* Icon buttons */
        .nav-icon-btn {
          width: 33px; height: 33px; display: flex; align-items: center; justify-content: center;
          border-radius: 9px; background: transparent; border: none; cursor: pointer;
          color: var(--text-muted); transition: background 0.12s, color 0.12s;
        }
        .nav-icon-btn:hover { background: var(--green-light); color: var(--green-deep); }
        .nav-icon-btn svg { width: 15px; height: 15px; }

        /* Export */
        .nav-export-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 0 13px; height: 32px;
          background: var(--green-bark); border: none; border-radius: 9px;
          color: #E8F5E0; font-size: 12px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer; letter-spacing: 0.01em;
          transition: background 0.15s, transform 0.1s;
          box-shadow: 0 1px 4px rgba(42,78,26,0.2), inset 0 1px 0 rgba(255,255,255,0.08);
          margin-left: 4px;
        }
        .nav-export-btn:hover { background: var(--green-deep); transform: translateY(-0.5px); }
        .nav-export-btn:active { transform: translateY(0); }
        .nav-export-btn svg { width: 12px; height: 12px; }

        /* Avatar pill */
        .nav-avatar-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 3px 9px 3px 4px; border-radius: 20px;
          background: var(--bg-surface); border: 1.5px solid var(--border);
          cursor: pointer; transition: border-color 0.12s, background 0.12s;
          margin-left: 4px;
        }
        .nav-avatar-btn:hover { border-color: #C8E8B0; background: var(--green-light); }
        .nav-avatar-circle {
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, var(--green-mid), var(--green-deep));
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .nav-avatar-name { font-size: 12px; font-weight: 500; color: var(--text-primary); }
        .nav-avatar-chevron { width: 10px; height: 10px; color: var(--text-muted); }

        /* Responsive */
        @media (max-width: 640px) {
          .nav-search-wrap, .nav-live, .nav-avatar-name,
          .nav-avatar-chevron, .nav-divider { display: none; }
        }
      `}</style>

      <div className="navbar-root">
        <header className="navbar-shell">
          <div className="navbar-inner">

            <a className="nav-logo" href="#">
              <div className="nav-logo-mark">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="nav-logo-name">Anve<span>shak</span></span>
            </a>

            <div className="nav-divider" />

            <div className="nav-search-wrap">
              <svg className="nav-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="nav-search-input" type="text" placeholder="Search anything..." />
              <span className="nav-search-kbd">⌘K</span>
            </div>

            <div className="nav-right">
              <div className="nav-live">
                <div className="nav-live-dot" />
                <span className="nav-live-text">Live</span>
              </div>

              <button className="nav-icon-btn" aria-label="Notifications">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              <button className="nav-icon-btn" aria-label="Theme">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>

              <button className="nav-export-btn">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>

              <button className="nav-avatar-btn" onClick={handleLogout} aria-label="Account">
                <div className="nav-avatar-circle">JK</div>
                <span className="nav-avatar-name">Jevline</span>
                <svg className="nav-avatar-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

          </div>
        </header>
      </div>
    </>
  )
}