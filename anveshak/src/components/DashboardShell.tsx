'use client'

import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export default function DashboardShell({ title, subtitle, children, actions }: Props) {
  return (
    <div className="min-h-screen bg-[#F4F9F0]">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-5 lg:p-7 overflow-x-hidden">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-5 border-b border-[#DFF0D6]/70">
            <div>
              <h1 className="text-lg font-semibold text-[#1E3312] tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-[#7A9E6A] mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          <div className="space-y-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
