import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard, useCollectorAnalytics } from '../../hooks/useCollector';
import { useTransactionFeed } from '../../hooks/useTransactions';
import { TransactionCard } from '../../components/transaction/TransactionCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';

export function CollectorDashboard() {
  const dashboard = useDashboard();
  const analytics = useCollectorAnalytics();
  const feed = useTransactionFeed();
  const [showDefaulters, setShowDefaulters] = useState(false);

  if (dashboard.isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  const stats = dashboard.data;
  const ana = analytics.data;
  const pending = feed.data?.items ?? [];

  const collected = parseFloat(stats?.amount_collected ?? '0');
  const expected = parseFloat(stats?.amount_expected ?? '0');
  const progressPct = expected > 0 ? Math.min((collected / expected) * 100, 100) : 0;

  return (
    <div className="p-4 space-y-6">
      {/* Period progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-700">{stats?.period_label || 'Today'}</p>
          <p className="text-sm text-gray-500">{stats?.collection_rate?.toFixed(1) ?? 0}%</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all ${
              progressPct >= 75 ? 'bg-green-500' : progressPct >= 40 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          GHS {collected.toFixed(2)} / GHS {expected.toFixed(2)} collected
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Clients</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_clients ?? 0}</p>
          <p className="text-xs text-gray-400">{stats?.active_clients ?? 0} active</p>
        </div>
        <div className={`bg-white rounded-xl border p-4 ${stats?.pending_transactions ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
          <p className="text-sm text-gray-500">Pending</p>
          <p className={`text-2xl font-bold ${stats?.pending_transactions ? 'text-amber-600' : 'text-gray-900'}`}>
            {stats?.pending_transactions ?? 0}
          </p>
          <p className="text-xs text-gray-400">transactions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Collection Rate</p>
          <p className={`text-2xl font-bold ${
            (stats?.collection_rate ?? 0) >= 75 ? 'text-green-600' : (stats?.collection_rate ?? 0) >= 40 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {stats?.collection_rate?.toFixed(1) ?? 0}%
          </p>
        </div>
        {stats?.next_payout_client ? (
          <Link
            to="/collector/schedule"
            className="bg-accent-50 rounded-xl border border-accent-200 p-4 hover:bg-accent-100 transition-colors"
          >
            <p className="text-sm text-accent-600">Next Payout</p>
            <p className="text-base font-bold text-accent-800 truncate">{stats.next_payout_client}</p>
            <p className="text-xs text-accent-500">
              {stats.next_payout_date
                ? new Date(stats.next_payout_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })
                : ''}
            </p>
          </Link>
        ) : (
          <Link
            to="/collector/submit-sms"
            className="bg-primary-50 rounded-xl border border-primary-200 p-4 flex flex-col items-center justify-center hover:bg-primary-100 transition-colors"
          >
            <svg className="w-6 h-6 text-primary-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium text-primary-700">Submit SMS</p>
          </Link>
        )}
      </div>

      {/* Payment status breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Status</h3>
        <div className="flex gap-3">
          <div className="flex-1 text-center py-2 bg-green-50 rounded-lg">
            <p className="text-xl font-bold text-green-600">{stats?.paid_count ?? 0}</p>
            <p className="text-xs text-green-700">Paid</p>
          </div>
          <div className="flex-1 text-center py-2 bg-amber-50 rounded-lg">
            <p className="text-xl font-bold text-amber-600">{stats?.partial_count ?? 0}</p>
            <p className="text-xs text-amber-700">Partial</p>
          </div>
          <div className="flex-1 text-center py-2 bg-red-50 rounded-lg">
            <p className="text-xl font-bold text-red-600">{stats?.unpaid_count ?? 0}</p>
            <p className="text-xs text-red-700">Unpaid</p>
          </div>
        </div>
      </div>

      {/* Defaulters list (collapsible) */}
      {ana && (ana.defaulters.length > 0 || ana.partial_payers.length > 0) && (
        <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
          <button
            onClick={() => setShowDefaulters(!showDefaulters)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div>
              <h3 className="text-sm font-semibold text-red-700">
                Unpaid / Partial ({ana.defaulters.length + ana.partial_payers.length})
              </h3>
              <p className="text-xs text-gray-500">Members who haven't fully paid this period</p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showDefaulters ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDefaulters && (
            <div className="px-4 pb-4 space-y-2">
              {ana.defaulters.map((d) => (
                <div key={d.client_id} className="flex items-center justify-between py-2 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.full_name}</p>
                    <p className="text-xs text-red-600">Unpaid</p>
                  </div>
                  <p className="text-sm font-medium text-red-600">
                    GHS {parseFloat(d.remaining).toFixed(2)} remaining
                  </p>
                </div>
              ))}
              {ana.partial_payers.map((d) => (
                <div key={d.client_id} className="flex items-center justify-between py-2 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.full_name}</p>
                    <p className="text-xs text-amber-600">
                      Paid GHS {parseFloat(d.paid).toFixed(2)} of GHS {parseFloat(d.expected).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-amber-600">
                    GHS {parseFloat(d.remaining).toFixed(2)} remaining
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 30-day trend */}
      {ana && ana.daily_trend.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Last 30 Days</h3>
          <div className="flex items-end gap-px h-24">
            {(() => {
              const maxAmt = Math.max(...ana.daily_trend.map(d => parseFloat(d.amount)), 1);
              return ana.daily_trend.map((d, i) => {
                const pct = (parseFloat(d.amount) / maxAmt) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary-400 rounded-t hover:bg-primary-600 transition-colors"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                    title={`${d.date}: GHS ${parseFloat(d.amount).toFixed(2)}`}
                  />
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Trust distribution */}
      {ana && (ana.trust_distribution.high + ana.trust_distribution.medium + ana.trust_distribution.low > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Trust Distribution (MTD)</h3>
          {(() => {
            const total = ana.trust_distribution.high + ana.trust_distribution.medium + ana.trust_distribution.low;
            const highPct = (ana.trust_distribution.high / total) * 100;
            const medPct = (ana.trust_distribution.medium / total) * 100;
            const lowPct = (ana.trust_distribution.low / total) * 100;
            return (
              <>
                <div className="flex w-full h-4 rounded-full overflow-hidden">
                  {highPct > 0 && <div className="bg-green-500" style={{ width: `${highPct}%` }} />}
                  {medPct > 0 && <div className="bg-amber-500" style={{ width: `${medPct}%` }} />}
                  {lowPct > 0 && <div className="bg-red-500" style={{ width: `${lowPct}%` }} />}
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-green-600">HIGH {ana.trust_distribution.high}</span>
                  <span className="text-amber-600">MEDIUM {ana.trust_distribution.medium}</span>
                  <span className="text-red-600">LOW {ana.trust_distribution.low}</span>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Top contributors */}
      {ana && ana.top_contributors.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Contributors (MTD)</h3>
          <div className="space-y-2">
            {ana.top_contributors.map((c, i) => (
              <div key={c.client_id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                  <span className="text-sm text-gray-900">{c.full_name}</span>
                </div>
                <span className="text-sm font-medium text-green-600">
                  GHS {parseFloat(c.total_deposits).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group health score */}
      {ana && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke={ana.group_health_score >= 70 ? '#22c55e' : ana.group_health_score >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${ana.group_health_score * 0.974} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
              {ana.group_health_score}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Group Health</p>
            <p className="text-xs text-gray-500">
              {ana.group_health_score >= 70 ? 'Great — keep it up!' :
               ana.group_health_score >= 40 ? 'Fair — room for improvement' :
               'Needs attention'}
            </p>
          </div>
        </div>
      )}

      {/* Pending transactions feed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Recent Pending</h2>
          {pending.length > 0 && (
            <Link to="/collector/transactions" className="text-sm text-primary-600 font-medium">
              View All
            </Link>
          )}
        </div>

        {feed.isLoading ? (
          <LoadingSpinner className="mt-8" />
        ) : pending.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="All caught up!"
            subtitle="No pending transactions to review"
          />
        ) : (
          <div className="space-y-3">
            {pending.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </div>

      {dashboard.isError && (
        <div className="text-center">
          <p className="text-sm text-red-600 mb-2">Failed to load dashboard</p>
          <Button size="sm" variant="secondary" onClick={() => dashboard.refetch()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
