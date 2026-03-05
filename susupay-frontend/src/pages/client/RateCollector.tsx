import { useState } from 'react';
import { useCollectorRatings, useRateCollector } from '../../hooks/useAnnouncements';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { AxiosError } from 'axios';

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className="p-1 transition-transform hover:scale-110"
        >
          <svg
            className={`w-8 h-8 ${star <= value ? 'text-amber-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function RateCollector() {
  const { data: ratings, isLoading } = useCollectorRatings();
  const rateCollector = useRateCollector();

  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setError('');
    if (score === 0) { setError('Please select a rating'); return; }
    rateCollector.mutate(
      { score, ...(comment.trim() ? { comment: comment.trim() } : {}) },
      {
        onSuccess: () => { setSubmitted(true); setScore(0); setComment(''); },
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setError(axiosErr.response?.data?.detail || 'Failed to submit rating');
        },
      },
    );
  }

  if (isLoading) return <LoadingSpinner className="mt-20" />;

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Rate Your Collector</h1>

      {/* Summary */}
      {ratings && ratings.total_ratings > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{ratings.average_score.toFixed(1)}</p>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className={`w-4 h-4 ${s <= Math.round(ratings.average_score) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{ratings.total_ratings} review{ratings.total_ratings !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((s) => {
              const count = ratings.ratings.filter((r) => r.score === s).length;
              const pct = ratings.total_ratings > 0 ? (count / ratings.total_ratings) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-gray-500">{s}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-amber-400 rounded-full h-2" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit rating */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        {submitted ? (
          <div className="text-center py-4">
            <svg className="w-10 h-10 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-medium text-gray-900">Thanks for your feedback!</p>
            <button onClick={() => setSubmitted(false)} className="text-sm text-primary-600 mt-2">Rate again</button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">How would you rate your collector?</p>
            <div className="flex justify-center">
              <StarRating value={score} onChange={setScore} />
            </div>
            <Textarea
              label="Comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              maxChars={500}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button fullWidth onClick={handleSubmit} loading={rateCollector.isPending}>Submit Rating</Button>
          </>
        )}
      </div>

      {/* Recent reviews */}
      {ratings && ratings.ratings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Recent Reviews</h2>
          {ratings.ratings.slice(0, 10).map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} className={`w-3.5 h-3.5 ${s <= r.score ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-xs text-gray-400 ml-2">
                  {new Date(r.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
