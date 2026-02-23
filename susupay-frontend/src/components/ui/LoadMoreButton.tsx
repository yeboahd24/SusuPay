import { LoadingSpinner } from './LoadingSpinner';

interface LoadMoreButtonProps {
  onClick: () => void;
  loading: boolean;
  hasMore: boolean;
}

export function LoadMoreButton({ onClick, loading, hasMore }: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-3 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? <LoadingSpinner className="mx-auto" /> : 'Load More'}
    </button>
  );
}
