import { useAchievements } from '../../hooks/useViral';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const ICON_MAP: Record<string, string> = {
  star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  fire: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
  trophy: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  coins: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  gem: 'M9 3l-6 7.5L12 21l9-10.5L15 3H9zm3 4.5v9',
  sunrise: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  'calendar-check': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zm4-7l2 2 4-4',
  crown: 'M5 16l-1-5 4 3 4-6 4 6 4-3-1 5H5z',
};

function AchievementIcon({ icon, className }: { icon: string; className?: string }) {
  const path = ICON_MAP[icon] || ICON_MAP.star;
  return (
    <svg className={className || 'w-6 h-6'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export function Achievements() {
  const { data, isLoading } = useAchievements();

  if (isLoading) return <LoadingSpinner className="mt-20" />;
  if (!data) return null;

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Achievements</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data.total_earned} of {data.total_available} unlocked
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
          style={{ width: `${(data.total_earned / data.total_available) * 100}%` }}
        />
      </div>

      {/* Earned achievements */}
      {data.earned.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Earned</h2>
          <div className="grid grid-cols-2 gap-3">
            {data.earned.map((a) => (
              <div
                key={a.achievement_type}
                className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-200 text-amber-700 flex items-center justify-center mb-2">
                  <AchievementIcon icon={a.icon} />
                </div>
                <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                {a.earned_at && (
                  <p className="text-[10px] text-amber-600 mt-1.5 font-medium">
                    {new Date(a.earned_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked achievements */}
      {data.available.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Locked</h2>
          <div className="grid grid-cols-2 gap-3">
            {data.available.map((a) => (
              <div
                key={a.achievement_type}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center opacity-60"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-200 text-gray-400 flex items-center justify-center mb-2">
                  <AchievementIcon icon={a.icon} />
                </div>
                <p className="text-sm font-semibold text-gray-500">{a.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
