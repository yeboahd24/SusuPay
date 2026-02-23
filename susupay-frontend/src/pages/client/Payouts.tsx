import { useState } from 'react';
import { useClientBalance, useMyPayouts, useRequestPayout } from '../../hooks/useClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Badge, statusBadgeColor } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { LoadMoreButton } from '../../components/ui/LoadMoreButton';
import type { PayoutType } from '../../types/payout';
import type { AxiosError } from 'axios';

export function Payouts() {
  const { data: balance } = useClientBalance();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyPayouts();
  const requestPayout = useRequestPayout();

  const [showRequest, setShowRequest] = useState(false);
  const [payoutType, setPayoutType] = useState<PayoutType>('SCHEDULED');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleRequest() {
    setError('');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    const currentBalance = parseFloat(balance?.balance ?? '0');
    if (parsedAmount > currentBalance) {
      setError('Amount exceeds your balance');
      return;
    }

    requestPayout.mutate(
      {
        amount: parsedAmount,
        payout_type: payoutType,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      },
      {
        onSuccess: () => {
          setShowRequest(false);
          setAmount('');
          setReason('');
          setPayoutType('SCHEDULED');
        },
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setError(axiosErr.response?.data?.detail || 'Failed to request payout');
        },
      },
    );
  }

  function closeModal() {
    setShowRequest(false);
    setAmount('');
    setReason('');
    setError('');
    setPayoutType('SCHEDULED');
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Payouts</h1>
        <Button size="sm" onClick={() => setShowRequest(true)}>
          Request Payout
        </Button>
      </div>

      {/* Balance reminder */}
      {balance && (
        <div className="bg-primary-50 rounded-xl border border-primary-200 p-4 text-center">
          <p className="text-xs text-primary-600 font-medium">Available Balance</p>
          <p className="text-2xl font-bold text-primary-800">GHS {balance.balance}</p>
        </div>
      )}

      {/* Payout list */}
      {isLoading ? (
        <LoadingSpinner className="mt-12" />
      ) : !(data?.pages.flatMap((p) => p.items).length) ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
          title="No payouts yet"
          subtitle="Request a payout when you're ready to withdraw"
        />
      ) : (
        <div className="space-y-3">
          {data.pages.flatMap((p) => p.items).map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">GHS {p.amount}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(p.requested_at).toLocaleDateString('en-GH', {
                      day: 'numeric', month: 'short', year: 'numeric',
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
            </div>
          ))}
          <LoadMoreButton
            onClick={() => fetchNextPage()}
            loading={isFetchingNextPage}
            hasMore={!!hasNextPage}
          />
        </div>
      )}

      {/* Request Payout Modal */}
      <Modal open={showRequest} onClose={closeModal} title="Request Payout">
        <div className="space-y-4">
          <Input
            label="Amount (GHS)"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 50.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Payout Type</label>
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setPayoutType('SCHEDULED')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  payoutType === 'SCHEDULED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Scheduled
              </button>
              <button
                onClick={() => setPayoutType('EMERGENCY')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  payoutType === 'EMERGENCY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Emergency
              </button>
            </div>
          </div>

          <Textarea
            label="Reason (optional)"
            placeholder="Why do you need this payout?"
            rows={2}
            maxChars={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRequest} loading={requestPayout.isPending}>
              Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
