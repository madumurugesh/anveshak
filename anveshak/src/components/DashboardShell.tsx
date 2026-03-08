'use client'

import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'

interface Props {
  title?: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export default function DashboardShell({ title, subtitle, children, actions }: Props) {
  return (
    <div className="min-h-screen" style={{ background: '#F5F7F5' }}>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '16px 20px', maxWidth: 1400, overflowX: 'hidden' as const }}>
          {title && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap' as const,
              gap: 12,
              paddingBottom: 14,
              marginBottom: 16,
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)', letterSpacing: '-0.01em' }}>
                  {title}
                </h1>
                {subtitle && (
                  <p style={{ fontSize: 11.5, color: 'var(--gray-500)', marginTop: 2 }}>{subtitle}</p>
                )}
              </div>
              {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
