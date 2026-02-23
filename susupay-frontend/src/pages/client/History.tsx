import { useState } from 'react';
import { useMyTransactions } from '../../hooks/useClient';
import { Badge, statusBadgeColor } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { LoadMoreButton } from '../../components/ui/LoadMoreButton';
import type { TransactionStatus } from '../../types/transaction';

const TABS: { label: string; value: TransactionStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Queried', value: 'QUERIED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export function History() {
  const [activeTab, setActiveTab] = useState<TransactionStatus | undefined>(undefined);
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyTransactions(activeTab);

  const transactions = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Transaction History</h1>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.value)}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${activeTab === tab.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <LoadingSpinner className="mt-12" />
      ) : !transactions.length ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title={`No ${activeTab?.toLowerCase() ?? ''} transactions`}
          subtitle="Your payment submissions will appear here"
        />
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">GHS {tx.amount}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.submitted_at).toLocaleDateString('en-GH', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={statusBadgeColor(tx.status)}>{tx.status}</Badge>
                  <span className={`text-xs font-medium ${
                    tx.trust_level === 'HIGH' ? 'text-green-600' :
                    tx.trust_level === 'MEDIUM' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {tx.trust_level}
                  </span>
                </div>
              </div>
              {tx.confirmed_at && (
                <p className="text-xs text-green-600 mt-2">
                  Confirmed: {new Date(tx.confirmed_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {tx.collector_note && (
                <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-2">
                  <span className="font-medium">Collector note:</span> {tx.collector_note}
                </p>
              )}
            </div>
          ))}
          <LoadMoreButton
            onClick={() => fetchNextPage()}
            loading={isFetchingNextPage}
            hasMore={!!hasNextPage}
          />
        </div>
      )}
    </div>
  );
}
