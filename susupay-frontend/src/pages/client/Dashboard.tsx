import { Link } from 'react-router-dom';
import { useClientBalance, useMyTransactions, useGroupMembers } from '../../hooks/useClient';
import { Badge, statusBadgeColor } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function ClientDashboard() {
  const balance = useClientBalance();
  const transactions = useMyTransactions();
  const group = useGroupMembers();

  if (balance.isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  const recent = transactions.data?.slice(0, 5) ?? [];
  const members = group.data ?? [];

  return (
    <div className="p-4 space-y-6">
      {/* Balance card */}
      <div className="bg-primary-50 rounded-xl border border-primary-200 p-6 text-center">
        <p className="text-sm text-primary-600 font-medium">Your Balance</p>
        <p className="text-3xl font-bold text-primary-800 mt-1">
          GHS {balance.data?.balance ?? '0.00'}
        </p>
        <div className="flex justify-center gap-6 mt-3 text-xs text-primary-600">
          <span>Deposits: GHS {balance.data?.total_deposits ?? '0.00'}</span>
          <span>Payouts: GHS {balance.data?.total_payouts ?? '0.00'}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/client/submit"
          className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center gap-2 hover:border-primary-300 transition-colors"
        >
          <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-sm font-medium text-gray-900">Submit Payment</p>
        </Link>
        <Link
          to="/client/payouts"
          className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center gap-2 hover:border-primary-300 transition-colors"
        >
          <svg className="w-8 h-8 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          <p className="text-sm font-medium text-gray-900">Request Payout</p>
        </Link>
      </div>

      {/* Group members */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Group Members</h2>
        {group.isLoading ? (
          <LoadingSpinner className="mt-4" size="sm" />
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-500">No group members yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_20px] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
              <span>Name</span>
              <span className="text-right">Txns</span>
              <span className="text-right">Deposits</span>
              <span className="text-right">Balance</span>
              <span />
            </div>
            {/* Rows */}
            {members.map((m) => {
              const hasDeposits = parseFloat(m.total_deposits) > 0;
              return (
                <Link
                  key={m.id}
                  to={`/client/group/${m.id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto_20px] gap-2 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${hasDeposits ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-900 truncate">{m.full_name}</span>
                  </div>
                  <span className="text-sm text-gray-500 text-right tabular-nums">{m.transaction_count}</span>
                  <span className="text-sm text-gray-600 text-right">GHS {m.total_deposits}</span>
                  <span className="text-sm font-medium text-gray-900 text-right">GHS {m.balance}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Recent Transactions</h2>
          {recent.length > 0 && (
            <Link to="/client/history" className="text-sm text-primary-600 font-medium">
              View All
            </Link>
          )}
        </div>

        {transactions.isLoading ? (
          <LoadingSpinner className="mt-8" />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            }
            title="No transactions yet"
            subtitle="Submit a payment to get started"
          />
        ) : (
          <div className="space-y-2">
            {recent.map((tx) => (
              <div key={tx.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">GHS {tx.amount}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.submitted_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Badge color={statusBadgeColor(tx.status)}>{tx.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
