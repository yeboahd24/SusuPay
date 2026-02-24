import { useState } from 'react';
import {
  useCollectorPayouts,
  useApprovePayout,
  useDeclinePayout,
  useCompletePayout,
} from '../../hooks/useCollector';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Badge, statusBadgeColor } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { PayoutStatus } from '../../types/payout';
import type { AxiosError } from 'axios';

const tabs: { label: string; value: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Requested', value: 'REQUESTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Declined', value: 'DECLINED' },
];

export function CollectorPayouts() {
  const [activeTab, setActiveTab] = useState('ALL');
  const { data, isLoading } = useCollectorPayouts(activeTab);

  const approvePayout = useApprovePayout();
  const declinePayout = useDeclinePayout();
  const completePayout = useCompletePayout();

  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineError, setDeclineError] = useState('');

  function handleApprove(id: string) {
    approvePayout.mutate(id);
  }

  function handleComplete(id: string) {
    completePayout.mutate(id);
  }

  function openDecline(id: string) {
    setDeclineId(id);
    setDeclineReason('');
    setDeclineError('');
  }

  function handleDecline() {
    if (!declineId) return;
    if (!declineReason.trim()) {
      setDeclineError('Please provide a reason');
      return;
    }
    declinePayout.mutate(
      { payoutId: declineId, payload: { reason: declineReason.trim() } },
      {
        onSuccess: () => setDeclineId(null),
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setDeclineError(axiosErr.response?.data?.detail || 'Failed to decline');
        },
      },
    );
  }

  const payouts = data?.items ?? [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Payouts</h1>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSpinner className="mt-12" />
      ) : !payouts.length ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
          title="No payouts"
          subtitle={activeTab === 'REQUESTED' ? 'No pending payout requests' : 'No payouts found'}
        />
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{p.client_name}</p>
                  <p className="text-lg font-bold text-gray-900">GHS {p.amount}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(p.requested_at).toLocaleDateString('en-GH', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={statusBadgeColor(p.status)}>{p.status}</Badge>
                  <Badge color={p.payout_type === 'EMERGENCY' ? 'amber' : 'gray'}>
                    {p.payout_type}
                  </Badge>
                </div>
              </div>

              {p.reason && (
                <p className="text-xs text-gray-600 mt-2">
                  <span className="font-medium">Reason:</span> {p.reason}
                </p>
              )}
              {p.approved_at && (
                <p className="text-xs text-green-600 mt-1">
                  Approved: {new Date(p.approved_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {p.completed_at && (
                <p className="text-xs text-green-700 mt-1">
                  Completed: {new Date(p.completed_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}

              {/* Action buttons */}
              {p.status === 'REQUESTED' && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(p.id)}
                    loading={approvePayout.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openDecline(p.id)}
                  >
                    Decline
                  </Button>
                </div>
              )}
              {p.status === 'APPROVED' && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={() => handleComplete(p.id)}
                    loading={completePayout.isPending}
                  >
                    Mark as Completed
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Decline modal */}
      <Modal
        open={!!declineId}
        onClose={() => setDeclineId(null)}
        title="Decline Payout"
      >
        <div className="space-y-4">
          <Textarea
            label="Reason for declining"
            placeholder="Explain why this payout is being declined..."
            rows={3}
            maxChars={500}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
          />
          {declineError && <p className="text-sm text-red-600">{declineError}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setDeclineId(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleDecline} loading={declinePayout.isPending}>
              Decline
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
