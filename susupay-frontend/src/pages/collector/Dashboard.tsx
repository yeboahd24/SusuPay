import { Link } from 'react-router-dom';
import { useDashboard } from '../../hooks/useCollector';
import { useTransactionFeed } from '../../hooks/useTransactions';
import { TransactionCard } from '../../components/transaction/TransactionCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';

export function CollectorDashboard() {
  const dashboard = useDashboard();
  const feed = useTransactionFeed();

  if (dashboard.isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  const stats = dashboard.data;
  const pending = feed.data?.items ?? [];

  return (
    <div className="p-4 space-y-6">
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
          <p className="text-sm text-gray-500">Confirmed Today</p>
          <p className="text-2xl font-bold text-green-600">
            GHS {stats?.total_confirmed_today ?? 0}
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
