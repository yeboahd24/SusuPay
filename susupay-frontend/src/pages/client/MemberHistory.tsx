import { useParams, Link } from 'react-router-dom';
import { useMemberHistory, useGroupMembers } from '../../hooks/useClient';
import { Badge, statusBadgeColor } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { LoadMoreButton } from '../../components/ui/LoadMoreButton';

export function MemberHistory() {
  const { memberId } = useParams<{ memberId: string }>();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMemberHistory(memberId ?? '');
  const { data: members } = useGroupMembers();

  const member = members?.find((m) => m.id === memberId);
  const transactions = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="p-4 space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          to="/client/dashboard"
          className="p-1 -ml-1 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {member?.full_name ?? 'Member'}
          </h1>
          {member && (
            <p className="text-sm text-gray-500">
              Balance: GHS {member.balance} &middot; {member.transaction_count} confirmed txn{member.transaction_count !== 1 ? 's' : ''}
            </p>
          )}
        </div>
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
          title="No transactions yet"
          subtitle="This member has no payment submissions"
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
