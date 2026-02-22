import { useState } from 'react';
import { Badge, statusBadgeColor } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { ValidationFlags } from './ValidationFlags';
import { useConfirmTransaction, useQueryTransaction, useRejectTransaction } from '../../hooks/useTransactions';
import type { TransactionFeedItem, TrustLevel } from '../../types/transaction';

function trustLevelColor(level: TrustLevel): string {
  switch (level) {
    case 'HIGH': return 'text-green-600 bg-green-50';
    case 'MEDIUM': return 'text-amber-600 bg-amber-50';
    case 'LOW': return 'text-red-600 bg-red-50';
    case 'AUTO_REJECTED': return 'text-red-600 bg-red-50';
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

interface TransactionCardProps {
  transaction: TransactionFeedItem;
}

export function TransactionCard({ transaction: tx }: TransactionCardProps) {
  const [noteModal, setNoteModal] = useState<'query' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const confirm = useConfirmTransaction();
  const query = useQueryTransaction();
  const reject = useRejectTransaction();

  const isBusy = confirm.isPending || query.isPending || reject.isPending;

  function handleConfirm() {
    confirm.mutate(tx.id);
  }

  function handleNoteSubmit() {
    const trimmed = note.trim();
    if (trimmed.length < 1) {
      setNoteError('Note is required');
      return;
    }
    if (trimmed.length > 500) {
      setNoteError('Note must be 500 characters or less');
      return;
    }
    setNoteError('');

    if (noteModal === 'query') {
      query.mutate({ id: tx.id, payload: { note: trimmed } }, {
        onSuccess: () => { setNoteModal(null); setNote(''); },
      });
    } else if (noteModal === 'reject') {
      reject.mutate({ id: tx.id, payload: { note: trimmed } }, {
        onSuccess: () => { setNoteModal(null); setNote(''); },
      });
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        {/* Header: client name + amount */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-900">{tx.client_name}</p>
            <p className="text-xs text-gray-500">{relativeTime(tx.submitted_at)}</p>
          </div>
          <p className="text-lg font-bold text-gray-900">GHS {tx.amount}</p>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          <Badge color={statusBadgeColor(tx.status)}>{tx.status}</Badge>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${trustLevelColor(tx.trust_level)}`}>
            {tx.trust_level}
          </span>
          <Badge color="gray">{tx.submission_type === 'SMS_TEXT' ? 'SMS' : 'Screenshot'}</Badge>
        </div>

        {/* Collector note if exists */}
        {tx.collector_note && (
          <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            <span className="font-medium">Note:</span> {tx.collector_note}
          </p>
        )}

        {/* Validation flags */}
        <ValidationFlags flags={tx.validation_flags} />

        {/* Action buttons */}
        {tx.status === 'PENDING' && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleConfirm} loading={confirm.isPending} disabled={isBusy}>
              Confirm
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setNoteModal('query')} disabled={isBusy}>
              Query
            </Button>
          </div>
        )}
        {tx.status === 'QUERIED' && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleConfirm} loading={confirm.isPending} disabled={isBusy}>
              Confirm
            </Button>
            <Button size="sm" variant="danger" onClick={() => setNoteModal('reject')} disabled={isBusy}>
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Note Modal for Query/Reject */}
      <Modal
        open={noteModal !== null}
        onClose={() => { setNoteModal(null); setNote(''); setNoteError(''); }}
        title={noteModal === 'query' ? 'Query Transaction' : 'Reject Transaction'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {noteModal === 'query'
              ? 'Explain why you are querying this transaction. The client will be notified.'
              : 'Explain why you are rejecting this transaction. This action is final.'}
          </p>
          <Textarea
            label="Note"
            placeholder="Enter your reason..."
            rows={3}
            maxChars={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={noteError}
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { setNoteModal(null); setNote(''); setNoteError(''); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={noteModal === 'reject' ? 'danger' : 'primary'}
              onClick={handleNoteSubmit}
              loading={query.isPending || reject.isPending}
            >
              {noteModal === 'query' ? 'Query' : 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
