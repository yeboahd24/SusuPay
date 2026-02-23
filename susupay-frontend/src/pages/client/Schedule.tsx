import { useGroupSchedule, useClientProfile, useMySchedule } from '../../hooks/useClient';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export function ClientSchedule() {
  const { data: schedule, isLoading, isError } = useGroupSchedule();
  const { data: profile } = useClientProfile();
  const { data: summary } = useMySchedule();

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  if (isError || !schedule) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Payout Schedule</h1>
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
          title="No schedule yet"
          subtitle="Your collector hasn't set up a payout rotation schedule yet"
        />
      </div>
    );
  }

  const intervalLabel =
    schedule.payout_interval_days === 7
      ? 'Weekly'
      : schedule.payout_interval_days === 14
      ? 'Bi-weekly'
      : schedule.payout_interval_days === 30
      ? 'Monthly'
      : `Every ${schedule.payout_interval_days} days`;

  return (
    <div className="p-4 pb-24 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Payout Schedule</h1>

      {/* My payout summary card */}
      {summary?.has_schedule && summary.my_position && (
        <div className="bg-primary-50 rounded-xl border border-primary-200 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm text-primary-600 font-medium">Your Payout</p>
              <p className="text-2xl font-bold text-primary-800">
                Position #{summary.my_position}
                <span className="text-sm font-normal text-primary-600 ml-1">of {summary.total_positions}</span>
              </p>
            </div>
            {summary.my_payout_date && (
              <div className="sm:text-right">
                <p className="text-lg font-semibold text-primary-800">
                  {new Date(summary.my_payout_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {summary.days_until_my_payout !== null && summary.days_until_my_payout >= 0 && (
                  <p className="text-sm text-primary-600">
                    {summary.days_until_my_payout === 0
                      ? 'Today!'
                      : `${summary.days_until_my_payout} day${summary.days_until_my_payout === 1 ? '' : 's'} away`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
        <span>{intervalLabel} payouts</span>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span>Cycle {schedule.current_cycle + 1}</span>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span>{schedule.entries.length} members</span>
      </div>

      {/* Schedule table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header — hide status column on very small screens */}
        <div className="grid grid-cols-[32px_1fr_auto] sm:grid-cols-[40px_1fr_auto_40px] gap-2 px-3 sm:px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
          <span>#</span>
          <span>Name</span>
          <span className="text-right">Date</span>
          <span className="hidden sm:block text-right" />
        </div>

        {/* Rows */}
        {schedule.entries.map((entry) => {
          const isMe = profile && entry.client_id === profile.id;
          const dateStr = new Date(entry.payout_date).toLocaleDateString('en-GH', {
            day: 'numeric',
            month: 'short',
          });

          return (
            <div
              key={entry.client_id}
              className={`grid grid-cols-[32px_1fr_auto] sm:grid-cols-[40px_1fr_auto_40px] gap-2 px-3 sm:px-4 py-3 border-b border-gray-100 last:border-b-0 items-center transition-colors ${
                entry.is_current
                  ? 'bg-primary-50'
                  : isMe
                  ? 'bg-amber-50'
                  : entry.is_completed
                  ? 'bg-gray-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              {/* Position number */}
              <span className={`text-sm font-bold ${entry.is_completed ? 'text-gray-300' : 'text-gray-500'}`}>
                {entry.payout_position}
              </span>

              {/* Name + badges */}
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-wrap">
                <span className={`text-sm truncate ${entry.is_completed ? 'text-gray-400' : 'text-gray-900'} ${isMe ? 'font-semibold' : ''}`}>
                  {entry.full_name}
                </span>
                {isMe && (
                  <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full leading-none">
                    You
                  </span>
                )}
                {entry.is_current && (
                  <span className="shrink-0 text-[10px] font-bold text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded-full leading-none">
                    Current
                  </span>
                )}
                {/* Checkmark inline on mobile */}
                {entry.is_completed && (
                  <svg className="w-4 h-4 text-green-500 shrink-0 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Date */}
              <span className={`text-sm text-right whitespace-nowrap ${entry.is_completed ? 'text-gray-400' : 'text-gray-600'}`}>
                {dateStr}
              </span>

              {/* Status icon — desktop only */}
              <span className="hidden sm:flex justify-end">
                {entry.is_completed && (
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
