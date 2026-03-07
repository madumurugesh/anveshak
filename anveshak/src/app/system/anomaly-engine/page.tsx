'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { anomalyEngine, analytics } from '@/lib/apiClients'
import type { AnomalyStats, AnalyticsAiUsageSummary } from '@/types/api'

export default function AnomalyEnginePage() {
  const [stats, setStats] = useState<AnomalyStats | null>(null)
  const [aiUsage, setAiUsage] = useState<AnalyticsAiUsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, aiRes] = await Promise.all([
          anomalyEngine.stats(),
          analytics.ai.usage().catch(() => null),
        ])
        setStats(statsRes)
        if (aiRes?.data) {
          setAiUsage(aiRes.data.summary)
        }
      } catch {
        setError('Failed to load anomaly engine status')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <DashboardShell title="Anomaly Engine Status" subtitle="ML-powered anomaly detection engine health">
      {loading && <div className="bg-white rounded-xl h-64 animate-pulse max-w-2xl" />}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}
      {!loading && !error && stats && (
        <div className="max-w-3xl space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-900 font-semibold text-lg">Engine Running</span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Total Anomalies</p>
                  <p className="text-2xl font-bold text-gray-900">{parseInt(stats.anomalies.total_anomalies).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Classified</p>
                  <p className="text-2xl font-bold text-green-600">{parseInt(stats.anomalies.classified).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{parseInt(stats.anomalies.pending).toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Avg Confidence</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.anomalies.avg_confidence ? `${(parseFloat(stats.anomalies.avg_confidence) * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">${parseFloat(stats.openai_usage.total_cost_usd).toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Latency</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.openai_usage.avg_latency_ms ? `${parseFloat(stats.openai_usage.avg_latency_ms).toFixed(0)}ms` : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Classification Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Supply Failure', value: stats.anomalies.supply_failure },
                  { label: 'Demand Collapse', value: stats.anomalies.demand_collapse },
                  { label: 'Fraud Pattern', value: stats.anomalies.fraud_pattern },
                  { label: 'Data Artifact', value: stats.anomalies.data_artifact },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-lg font-bold text-gray-900">{parseInt(item.value).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {aiUsage && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">AI Usage Summary (Analytics Engine)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Total API Calls</p>
                  <p className="text-lg font-bold text-gray-900">{parseInt(aiUsage.total_calls).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Successful</p>
                  <p className="text-lg font-bold text-green-600">{parseInt(aiUsage.successful_calls).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Failed</p>
                  <p className="text-lg font-bold text-red-600">{parseInt(aiUsage.failed_calls).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Cost</p>
                  <p className="text-lg font-bold text-gray-900">${parseFloat(aiUsage.total_cost_usd).toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Latency</p>
                  <p className="text-lg font-bold text-gray-900">{parseFloat(aiUsage.avg_latency_ms).toFixed(0)}ms</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Tokens</p>
                  <p className="text-lg font-bold text-gray-900">{parseInt(aiUsage.total_tokens).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  )
}
