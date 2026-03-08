'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import Cookies from 'js-cookie'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!password) {
      setError('Password is required.')
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      Cookies.set('accessToken', 'authenticated', { expires: rememberMe ? 7 : 1, sameSite: 'lax' })
      Cookies.set('userEmail', email, { expires: rememberMe ? 7 : 1, sameSite: 'lax' })
      router.push('/dashboard')
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" suppressHydrationWarning>
      <div className="flex flex-1">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between px-6 sm:px-12 lg:px-20 py-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Anveshak" width={36} height={36} className="rounded-lg object-cover" />
            <span className="text-xl font-bold text-gray-900">Anveshak</span>
          </div>

          {/* Form Section */}
          <div className="max-w-sm w-full mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500 text-sm mb-8">
              Enter your email and password to access your account.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@gov.in"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4CFF42] focus:border-transparent transition bg-white"
                  autoComplete="email"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4CFF42] focus:border-transparent transition pr-12 bg-white"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between mb-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#4CFF42] focus:ring-[#4CFF42] accent-[#3BD636]"
                  />
                  <span className="text-sm text-gray-600">Remember Me</span>
                </label>
                <button type="button" className="text-sm font-medium text-[#2EAF2E] hover:text-[#1E8C1E] transition">
                  Forgot Your Password?
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-500/30 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[#3BD636] hover:bg-[#2EAF2E] text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#4CFF42]/25"
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {loading ? 'Signing in...' : 'Log In'}
              </button>

              {/* Register Link */}
              <p className="text-center text-sm text-gray-500 mt-6">
                Don&apos;t Have An Account?{' '}
                <button type="button" className="font-medium text-[#2EAF2E] hover:text-[#1E8C1E] transition">
                  Register Now.
                </button>
              </p>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Copyright &copy; 2025 Anveshak.</span>
            <button type="button" className="hover:text-gray-600 transition">Privacy Policy</button>
          </div>
        </div>

        {/* Right Side - Green Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#3BD636] to-[#2EAF2E] flex-col justify-center items-center px-12 py-16 relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#4CFF42] rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1E8C1E] rounded-full translate-y-1/3 -translate-x-1/4" />
          </div>

          <div className="relative z-10 max-w-lg text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
              Effortlessly monitor schemes and operations.
            </h2>
            <p className="text-green-200/80 text-base mb-10">
              Log in to access your Anveshak dashboard and track last-mile delivery.
            </p>

            {/* Dashboard Preview Cards */}
            <div className="relative mx-auto w-full max-w-md">
              {/* Main card */}
              <div className="bg-white rounded-xl shadow-2xl p-5 transform rotate-[-2deg]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-400">Total Disbursements</p>
                    <p className="text-xl font-bold text-gray-900">&#8377;18,93,740</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Beneficiaries</p>
                    <p className="text-xl font-bold text-gray-900">6,248</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[40, 65, 45, 80, 55, 70, 60, 75, 50, 85, 65, 72].map((h, i) => (
                    <div key={i} className="flex-1 bg-[#4CFF42]/30 rounded-sm" style={{ height: `${h * 0.5}px` }} />
                  ))}
                </div>
              </div>

              {/* Floating card - top right */}
              <div className="absolute -top-12 -right-4 bg-white rounded-lg shadow-lg px-4 py-3 transform rotate-[3deg]">
                <p className="text-xs text-gray-400">Active Schemes</p>
                <p className="text-lg font-bold text-[#2EAF2E]">42</p>
              </div>

              {/* Floating card - bottom left */}
              <div className="absolute -bottom-12 -left-4 bg-white rounded-lg shadow-lg px-4 py-3 transform rotate-[-3deg]">
                <p className="text-xs text-gray-400">Alerts Today</p>
                <p className="text-lg font-bold text-orange-500">17</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
