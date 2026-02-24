import { Link } from 'react-router-dom';
import { useClientBalance, useMyTransactions, useGroupMembers, useMySchedule, useClientAnalytics } from '../../hooks/useClient';
import { Badge, statusBadgeColor } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function ClientDashboard() {
  const balance = useClientBalance();
  const transactions = useMyTransactions();
  const group = useGroupMembers();
  const schedule = useMySchedule();
  const analytics = useClientAnalytics();

  if (balance.isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  const recent = (transactions.data?.pages.flatMap((p) => p.items) ?? []).slice(0, 5);
  const members = group.data ?? [];
  const ana = analytics.data;

  const periodPaid = parseFloat(ana?.period_status.paid ?? '0');
  const periodExpected = parseFloat(ana?.period_status.expected ?? '0');
  const periodRemaining = parseFloat(ana?.period_status.remaining ?? '0');
  const periodPct = periodExpected > 0 ? Math.min((periodPaid / periodExpected) * 100, 100) : 0;
  const periodStatus = ana?.period_status.status ?? 'UNPAID';

  return (
    <div className="p-4 space-y-6">
      {/* Period status card */}
      {ana && periodExpected > 0 && (
        <div className={`rounded-xl border p-4 ${
          periodStatus === 'PAID' || periodStatus === 'OVERPAID'
            ? 'bg-green-50 border-green-200'
            : periodStatus === 'PARTIAL'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">{ana.period_status.period_label}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              periodStatus === 'PAID' || periodStatus === 'OVERPAID'
                ? 'bg-green-100 text-green-700'
                : periodStatus === 'PARTIAL'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {periodStatus}
            </span>
          </div>
          <div className="w-full bg-white/60 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all ${
                periodStatus === 'PAID' || periodStatus === 'OVERPAID' ? 'bg-green-500' : periodStatus === 'PARTIAL' ? 'bg-amber-500' : 'bg-red-400'
              }`}
              style={{ width: `${periodPct}%` }}
            />
          </div>
          <p className="text-sm text-gray-700">
            GHS {periodPaid.toFixed(2)} of GHS {periodExpected.toFixed(2)}
            {periodRemaining > 0 && (
              <span className="text-gray-500"> — GHS {periodRemaining.toFixed(2)} remaining</span>
            )}
          </p>
        </div>
      )}

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

      {/* Streak + monthly compliance + group progress */}
      {ana && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-primary-600">{ana.payment_streak}</p>
            <p className="text-xs text-gray-500">Streak</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{ana.monthly_compliance.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">Monthly</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{ana.group_paid_count}/{ana.group_total_count}</p>
            <p className="text-xs text-gray-500">Group Paid</p>
          </div>
        </div>
      )}

      {/* Payout schedule card */}
      {schedule.data?.has_schedule && (
        <Link
          to="/client/schedule"
          className="block bg-white rounded-xl border border-accent-200 p-4 hover:border-accent-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-accent-700">Payout Schedule</p>
            <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
          <div className="flex items-baseline gap-3">
            {schedule.data.my_position && (
              <div>
                <span className="text-2xl font-bold text-gray-900">#{schedule.data.my_position}</span>
                <span className="text-xs text-gray-500 ml-1">of {schedule.data.total_positions}</span>
              </div>
            )}
            {schedule.data.my_payout_date && (
              <div className="text-right flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(schedule.data.my_payout_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                </p>
                {schedule.data.days_until_my_payout !== null && schedule.data.days_until_my_payout >= 0 && (
                  <p className="text-xs text-accent-600">
                    {schedule.data.days_until_my_payout === 0
                      ? 'Today!'
                      : `${schedule.data.days_until_my_payout} day${schedule.data.days_until_my_payout === 1 ? '' : 's'} away`}
                  </p>
                )}
              </div>
            )}
          </div>
          {schedule.data.current_recipient_name && (
            <p className="text-xs text-gray-500 mt-2">
              Current: <span className="font-medium text-gray-700">{schedule.data.current_recipient_name}</span>
            </p>
          )}
        </Link>
      )}

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
            <div className="grid grid-cols-[1fr_auto_auto_20px] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
              <span>Name</span>
              <span className="text-right">Period</span>
              <span className="text-right">Balance</span>
              <span />
            </div>
            {/* Rows */}
            {members.map((m) => (
              <Link
                key={m.id}
                to={`/client/group/${m.id}`}
                className="grid grid-cols-[1fr_auto_auto_20px] gap-2 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    m.period_status === 'PAID' || m.period_status === 'OVERPAID'
                      ? 'bg-green-500'
                      : m.period_status === 'PARTIAL'
                      ? 'bg-amber-500'
                      : 'bg-red-400'
                  }`} />
                  <span className="text-sm text-gray-900 truncate">{m.full_name}</span>
                </div>
                <span className={`text-xs font-medium text-right ${
                  m.period_status === 'PAID' || m.period_status === 'OVERPAID'
                    ? 'text-green-600'
                    : m.period_status === 'PARTIAL'
                    ? 'text-amber-600'
                    : 'text-red-500'
                }`}>
                  {m.period_status === 'PAID' || m.period_status === 'OVERPAID' ? 'Paid' : m.period_status === 'PARTIAL' ? 'Partial' : 'Unpaid'}
                </span>
                <span className="text-sm font-medium text-gray-900 text-right">GHS {m.balance}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
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
