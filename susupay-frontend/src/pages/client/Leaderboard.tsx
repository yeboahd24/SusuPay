import { useLeaderboard } from '../../hooks/useViral';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">&#x1F947;</span>;
  if (rank === 2) return <span className="text-xl">&#x1F948;</span>;
  if (rank === 3) return <span className="text-xl">&#x1F949;</span>;
  return <span className="text-sm font-bold text-gray-400">#{rank}</span>;
}

export function Leaderboard() {
  const { data, isLoading } = useLeaderboard();

  if (isLoading) return <LoadingSpinner className="mt-20" />;
  if (!data) return null;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-sm text-gray-500">{data.period_label} rankings</p>
      </div>

      {data.my_rank && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-center">
          <p className="text-sm text-primary-600 font-medium">Your Rank</p>
          <p className="text-3xl font-bold text-primary-800">#{data.my_rank}</p>
          <p className="text-xs text-primary-500 mt-1">of {data.entries.length} members</p>
        </div>
      )}

      {data.entries.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          title="No activity yet"
          subtitle="Start making deposits to appear on the leaderboard"
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {data.entries.map((entry) => (
            <div
              key={entry.client_id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                entry.is_current_user ? 'bg-primary-50' : ''
              }`}
            >
              <div className="w-10 flex items-center justify-center shrink-0">
                <MedalIcon rank={entry.rank} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  entry.is_current_user ? 'text-primary-800' : 'text-gray-900'
                }`}>
                  {entry.full_name}
                  {entry.is_current_user && (
                    <span className="ml-1.5 text-xs font-semibold text-primary-600">(You)</span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">GHS {parseFloat(entry.total_deposits).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
