import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useClientBalance, useMyTransactions, useGroupMembers, useMySchedule, useClientAnalytics } from '../../hooks/useClient';
import { useAnnouncementFeed } from '../../hooks/useAnnouncements';
import { Badge, statusBadgeColor } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function ClientDashboard() {
  const { t } = useTranslation();
  const balance = useClientBalance();
  const transactions = useMyTransactions();
  const group = useGroupMembers();
  const schedule = useMySchedule();
  const analytics = useClientAnalytics();
  const announcementsFeed = useAnnouncementFeed();

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
            GHS {periodPaid.toFixed(2)} / GHS {periodExpected.toFixed(2)}
            {periodRemaining > 0 && (
              <span className="text-gray-500"> — GHS {periodRemaining.toFixed(2)} {t('common.remaining')}</span>
            )}
          </p>
        </div>
      )}

      {/* Pinned announcements */}
      {announcementsFeed.data?.filter((a) => a.is_pinned).slice(0, 2).map((a) => (
        <Link key={a.id} to="/client/announcements" className="block bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-900 truncate">{a.title}</p>
              <p className="text-xs text-blue-700 mt-0.5 line-clamp-2">{a.body}</p>
            </div>
          </div>
        </Link>
      ))}

      {/* Balance card */}
      <div className="bg-primary-50 rounded-xl border border-primary-200 p-6 text-center">
        <p className="text-sm text-primary-600 font-medium">{t('client.dashboard.yourBalance')}</p>
        <p className="text-3xl font-bold text-primary-800 mt-1">
          GHS {balance.data?.balance ?? '0.00'}
        </p>
        <div className="flex justify-center gap-6 mt-3 text-xs text-primary-600">
          <span>{t('client.dashboard.deposits')}: GHS {balance.data?.total_deposits ?? '0.00'}</span>
          <span>{t('client.dashboard.payouts')}: GHS {balance.data?.total_payouts ?? '0.00'}</span>
        </div>
      </div>

      {/* Streak + monthly compliance + group progress */}
      {ana && (
        <div className="grid grid-cols-3 gap-3">
          {/* Streak card with visual flair */}
          <div className={`rounded-xl border p-3 text-center ${
            ana.payment_streak >= 7
              ? 'bg-orange-50 border-orange-200'
              : ana.payment_streak >= 3
              ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-gray-200'
          }`}>
            <p className={`text-2xl font-bold ${
              ana.payment_streak >= 7 ? 'text-orange-600' :
              ana.payment_streak >= 3 ? 'text-amber-600' :
              'text-primary-600'
            }`}>
              {ana.payment_streak}
            </p>
            <p className="text-xs text-gray-500">{t('client.dashboard.streak')}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{ana.monthly_compliance.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">{t('client.dashboard.monthly')}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{ana.group_paid_count}/{ana.group_total_count}</p>
            <p className="text-xs text-gray-500">{t('client.dashboard.groupPaid')}</p>
          </div>
        </div>
      )}

      {/* Streak message */}
      {ana && ana.streak_message && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium text-center ${
          ana.payment_streak >= 7
            ? 'bg-orange-50 text-orange-700 border border-orange-200'
            : ana.payment_streak >= 3
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : ana.payment_streak > 0
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-gray-50 text-gray-600 border border-gray-200'
        }`}>
          {ana.streak_message}
        </div>
      )}

      {/* Payout schedule card */}
      {schedule.data?.has_schedule && (
        <Link
          to="/client/schedule"
          className="block bg-white rounded-xl border border-accent-200 p-4 hover:border-accent-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-accent-700">{t('client.dashboard.payoutSchedule')}</p>
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
                      ? t('common.today') + '!'
                      : t('client.dashboard.daysAway', { count: schedule.data.days_until_my_payout })}
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
          <p className="text-sm font-medium text-gray-900">{t('client.dashboard.submitPayment')}</p>
        </Link>
        <Link
          to="/client/payouts"
          className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center gap-2 hover:border-primary-300 transition-colors"
        >
          <svg className="w-8 h-8 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          <p className="text-sm font-medium text-gray-900">{t('client.dashboard.requestPayout')}</p>
        </Link>
      </div>

      {/* Viral features: Achievements, Leaderboard, Goals */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          to="/client/achievements"
          className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-3 text-center hover:shadow-md transition-shadow"
        >
          <svg className="w-7 h-7 mx-auto text-amber-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-xs font-semibold text-amber-800">Badges</p>
        </Link>
        <Link
          to="/client/leaderboard"
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-3 text-center hover:shadow-md transition-shadow"
        >
          <svg className="w-7 h-7 mx-auto text-blue-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xs font-semibold text-blue-800">Rankings</p>
        </Link>
        <Link
          to="/client/goals"
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-3 text-center hover:shadow-md transition-shadow"
        >
          <svg className="w-7 h-7 mx-auto text-green-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-xs font-semibold text-green-800">Goals</p>
        </Link>
      </div>

      {/* Group members */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">{t('client.dashboard.groupMembers')}</h2>
        {group.isLoading ? (
          <LoadingSpinner className="mt-4" size="sm" />
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-500">{t('client.dashboard.noMembers')}</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_20px] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
              <span>{t('client.dashboard.name')}</span>
              <span className="text-right">{t('client.dashboard.period')}</span>
              <span className="text-right">{t('client.dashboard.balance')}</span>
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
                  {m.period_status === 'PAID' || m.period_status === 'OVERPAID' ? t('collector.dashboard.paid') : m.period_status === 'PARTIAL' ? t('collector.dashboard.partial') : t('collector.dashboard.unpaid')}
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
          <h2 className="text-base font-semibold text-gray-900">{t('client.dashboard.recentTransactions')}</h2>
          {recent.length > 0 && (
            <Link to="/client/history" className="text-sm text-primary-600 font-medium">
              {t('common.viewAll')}
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
            title={t('client.dashboard.noTransactions')}
            subtitle={t('client.dashboard.noTransactionsDesc')}
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
