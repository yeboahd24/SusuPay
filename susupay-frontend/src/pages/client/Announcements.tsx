import { useAnnouncementFeed } from '../../hooks/useAnnouncements';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function ClientAnnouncements() {
  const { data: announcements, isLoading } = useAnnouncementFeed();

  if (isLoading) return <LoadingSpinner className="mt-20" />;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Announcements</h1>

      {!announcements?.length ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
            </svg>
          }
          title="No announcements yet"
          subtitle="Your collector hasn't posted any announcements"
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className={`bg-white rounded-xl border p-4 ${a.is_pinned ? 'border-primary-300 bg-primary-50/30' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {a.is_pinned && (
                  <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">Pinned</span>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{a.title}</h3>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
