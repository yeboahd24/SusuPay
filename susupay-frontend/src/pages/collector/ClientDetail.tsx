import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClient, useUpdateClient, useDeactivateClient } from '../../hooks/useCollector';
import { useTransactions } from '../../hooks/useTransactions';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, statusBadgeColor } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import type { AxiosError } from 'axios';

export function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(clientId!);
  const { data: transactionsData } = useTransactions();
  const updateClient = useUpdateClient();
  const deactivateClient = useDeactivateClient();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [showDeactivate, setShowDeactivate] = useState(false);

  const clientTransactions = (transactionsData?.pages.flatMap((p) => p.items) ?? []).filter((tx) => tx.client_id === clientId);

  function startEdit() {
    if (!client) return;
    setEditName(client.full_name);
    setEditError('');
    setEditing(true);
  }

  function handleSave() {
    if (!clientId) return;
    setEditError('');

    const name = editName.trim();
    if (!name) {
      setEditError('Name is required');
      return;
    }

    updateClient.mutate(
      { clientId, payload: { full_name: name } },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setEditError(axiosErr.response?.data?.detail || 'Failed to update');
        },
      },
    );
  }

  function handleDeactivate() {
    if (!clientId) return;
    deactivateClient.mutate(clientId, {
      onSuccess: () => navigate('/collector/clients', { replace: true }),
    });
  }

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  if (!client) {
    return (
      <div className="p-4">
        <p className="text-gray-600">Client not found.</p>
        <Button size="sm" variant="secondary" onClick={() => navigate('/collector/clients')} className="mt-2">
          Back to Clients
        </Button>
      </div>
    );
  }

  const periodPaid = parseFloat(client.period_paid ?? '0');
  const periodExpected = parseFloat(client.period_expected ?? '0');
  const periodPct = periodExpected > 0 ? Math.min((periodPaid / periodExpected) * 100, 100) : 0;

  return (
    <div className="p-4 space-y-6">
      {/* Back link */}
      <button onClick={() => navigate('/collector/clients')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Clients
      </button>

      {/* Balance card */}
      <div className="bg-primary-50 rounded-xl border border-primary-200 p-6 text-center">
        <p className="text-sm text-primary-600 font-medium">Balance</p>
        <p className="text-3xl font-bold text-primary-800">GHS {client.balance}</p>
      </div>

      {/* Period status card */}
      {periodExpected > 0 && (
        <div className={`rounded-xl border p-4 ${
          client.period_status === 'PAID' || client.period_status === 'OVERPAID'
            ? 'bg-green-50 border-green-200'
            : client.period_status === 'PARTIAL'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Period Payment</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              client.period_status === 'PAID' || client.period_status === 'OVERPAID'
                ? 'bg-green-100 text-green-700'
                : client.period_status === 'PARTIAL'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {client.period_status}
            </span>
          </div>
          <div className="w-full bg-white/60 rounded-full h-2.5 mb-2">
            <div
              className={`h-2.5 rounded-full transition-all ${
                client.period_status === 'PAID' || client.period_status === 'OVERPAID' ? 'bg-green-500' : client.period_status === 'PARTIAL' ? 'bg-amber-500' : 'bg-red-400'
              }`}
              style={{ width: `${periodPct}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">
            GHS {periodPaid.toFixed(2)} of GHS {periodExpected.toFixed(2)}
          </p>
        </div>
      )}

      {/* Client info */}
      {editing ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <Input label="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} loading={updateClient.isPending}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{client.full_name}</h2>
                <Badge color={client.is_active ? 'green' : 'red'}>
                  {client.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">{client.phone}</p>
            </div>
            <button onClick={startEdit} className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Edit
            </button>
          </div>
          <div className="pt-2 text-sm">
            <p className="text-gray-500">Joined</p>
            <p className="font-medium text-gray-900">
              {new Date(client.joined_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Transaction History</h3>
        {clientTransactions.length === 0 ? (
          <EmptyState title="No transactions yet" subtitle="Transactions for this client will appear here" />
        ) : (
          <div className="space-y-2">
            {clientTransactions.map((tx) => (
              <div key={tx.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">GHS {tx.amount}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.submitted_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Badge color={statusBadgeColor(tx.status)}>{tx.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deactivate */}
      {client.is_active && (
        <Button variant="danger" fullWidth onClick={() => setShowDeactivate(true)}>
          Deactivate Client
        </Button>
      )}

      <Modal open={showDeactivate} onClose={() => setShowDeactivate(false)} title="Deactivate Client">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to deactivate <strong>{client.full_name}</strong>? They will no longer be able to submit payments.
          </p>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setShowDeactivate(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleDeactivate} loading={deactivateClient.isPending}>
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
