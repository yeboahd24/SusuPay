import { useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { TransactionCard } from '../../components/transaction/TransactionCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { TransactionStatus } from '../../types/transaction';

const TABS: { label: string; value: TransactionStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Queried', value: 'QUERIED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export function Transactions() {
  const [activeTab, setActiveTab] = useState<TransactionStatus | undefined>(undefined);
  const { data: transactions, isLoading, refetch } = useTransactions(activeTab);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Transactions</h1>

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
      ) : !transactions?.length ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m5.25 0l-3-3m0 0l-3 3" />
            </svg>
          }
          title={`No ${activeTab?.toLowerCase() ?? ''} transactions`}
          subtitle="Transactions will appear here once clients make payments"
        />
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <TransactionCard key={tx.id} transaction={tx} />
          ))}
        </div>
      )}

      {/* Pull to refresh hint */}
      <button
        onClick={() => refetch()}
        className="w-full text-center text-sm text-gray-400 py-2 hover:text-gray-600"
      >
        Tap to refresh
      </button>
    </div>
  );
}
