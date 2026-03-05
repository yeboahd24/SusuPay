import { useState } from 'react';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement, useUpdateAnnouncement } from '../../hooks/useAnnouncements';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { AxiosError } from 'axios';

export function Announcements() {
  const { data: announcements, isLoading } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState('');

  function handleCreate() {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (!body.trim()) { setError('Message is required'); return; }

    createAnnouncement.mutate(
      { title: title.trim(), body: body.trim(), is_pinned: isPinned },
      {
        onSuccess: () => { setShowCreate(false); setTitle(''); setBody(''); setIsPinned(false); },
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setError(axiosErr.response?.data?.detail || 'Failed to create announcement');
        },
      },
    );
  }

  function togglePin(id: string, currentlyPinned: boolean) {
    updateAnnouncement.mutate({ id, payload: { is_pinned: !currentlyPinned } });
  }

  function handleDelete(id: string) {
    if (confirm('Delete this announcement?')) {
      deleteAnnouncement.mutate(id);
    }
  }

  if (isLoading) return <LoadingSpinner className="mt-20" />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>New</Button>
      </div>

      {!announcements?.length ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
            </svg>
          }
          title="No announcements yet"
          subtitle="Broadcast messages to all your clients"
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className={`bg-white rounded-xl border p-4 ${a.is_pinned ? 'border-primary-300 bg-primary-50/30' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {a.is_pinned && (
                      <svg className="w-4 h-4 text-primary-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                    )}
                    <h3 className="font-semibold text-gray-900 truncate">{a.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(a.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePin(a.id, a.is_pinned)}
                    className={`p-1.5 rounded-lg ${a.is_pinned ? 'text-primary-600 bg-primary-100' : 'text-gray-400 hover:text-gray-600'}`}
                    title={a.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Announcement">
        <div className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. No collection on Saturday" maxLength={120} />
          <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details for your clients..." rows={4} maxChars={2000} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-gray-700">Pin to top</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} loading={createAnnouncement.isPending}>Post</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
