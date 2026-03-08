'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
      },
    ],
  },
  {
    label: 'Analytics',
    items: [
      {
        label: 'Performance',
        href: '/analytics/scheme',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
      },
      {
        label: 'Anomalies',
        href: '/analytics/anomalies',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
      },
      {
        label: 'Trends',
        href: '/analytics/trends',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>,
      },
      {
        label: 'Beneficiaries',
        href: '/schemes/beneficiaries',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
      },
    ],
  },
  {
    label: 'Geographic',
    items: [
      {
        label: 'Hotspot Map',
        href: '/geo/hotspot-map',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
      },
    ],
  },
  {
    label: 'Schemes',
    items: [
      {
        label: 'Registry',
        href: '/schemes/registry',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>,
      },
      {
        label: 'Upload Scheme',
        href: '/schemes/upload',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
      },
    ],
  },
]

const schemeEntries = [
  { name: 'PM-KISAN', color: '#22A658' },
  { name: 'MGNREGA', color: '#1E7A45' },
  { name: 'NSAP', color: '#F9AB00' },
  { name: 'PDS', color: '#4285F4' },
  { name: 'Ujjwala', color: '#EA4335' },
]

const extraLinks: NavItem[] = [
  {
    label: 'Field Officers',
    href: '/operations/field-officers',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
  },
  {
    label: 'Reports',
    href: '/reports/scheduled',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  },
  {
    label: 'Anomaly Engine',
    href: '/system/anomaly-engine',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/></svg>,
  },
  {
    label: 'Live Demo',
    href: '/system/demo',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <style>{`
        .sidebar {
          width: 188px;
          min-width: 188px;
          min-height: calc(100vh - 48px);
          background: var(--white);
          border-right: 1px solid var(--border);
          padding: 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          position: sticky;
          top: 48px;
          height: calc(100vh - 48px);
          overflow-y: auto;
        }
        .nav-group-label {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--gray-400);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          padding: 10px 10px 4px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 500;
          color: var(--gray-700);
          cursor: pointer;
          text-decoration: none;
          transition: all 0.12s;
        }
        .nav-item:hover { background: var(--green-50); color: var(--green-700); }
        .nav-item.active {
          background: var(--green-100);
          color: var(--green-800);
          font-weight: 600;
        }
        .nav-item svg { opacity: 0.65; flex-shrink: 0; }
        .nav-item.active svg { opacity: 1; }
        .sidebar-divider {
          height: 1px;
          background: var(--border);
          margin: 4px 0;
        }
        @media (max-width: 1023px) {
          .sidebar { display: none; }
        }
      `}</style>

      <aside className="sidebar">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="nav-group-label" style={group.label !== 'Overview' ? { marginTop: 4 } : undefined}>
              {group.label}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`nav-item${isActive(item.href) ? ' active' : ''}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        ))}

        <div className="sidebar-divider" style={{ marginTop: 8 }} />

        <div className="nav-group-label">Schemes</div>
        {schemeEntries.map((s) => (
          <Link
            key={s.name}
            href={`/schemes/${s.name.toLowerCase()}`}
            className="nav-item"
            style={{ paddingTop: 5, paddingBottom: 5 }}
          >
            <span
              className="status-dot"
              style={{ background: s.color }}
            />
            <span style={{ fontSize: 11 }}>{s.name}</span>
          </Link>
        ))}

        <div className="sidebar-divider" style={{ marginTop: 6 }} />

        {extraLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${isActive(item.href) ? ' active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <div style={{
            background: 'var(--green-50)',
            border: '1px solid var(--green-100)',
            borderRadius: 8,
            padding: '10px 12px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--green-700)', marginBottom: 3 }}>
              Last Synced
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>
              Today, {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} IST
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span className="status-dot dot-green" />
              <span style={{ fontSize: 10, color: 'var(--green-600)', fontWeight: 500 }}>Live</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
