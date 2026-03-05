import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientBalance, useRequestPayout } from '../../hooks/useClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import type { AxiosError } from 'axios';

const EMERGENCY_REASONS = [
  'Medical emergency',
  'Family emergency',
  'School fees',
  'Business needs',
  'Other',
];

export function EmergencyWithdrawal() {
  const navigate = useNavigate();
  const { data: balance } = useClientBalance();
  const requestPayout = useRequestPayout();

  const [amount, setAmount] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const reason = selectedReason === 'Other' ? customReason.trim() : selectedReason;

  function handleSubmit() {
    setError('');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount'); return;
    }
    const currentBalance = parseFloat(balance?.balance ?? '0');
    if (parsedAmount > currentBalance) {
      setError('Amount exceeds your balance'); return;
    }
    if (!reason) {
      setError('Please select or enter a reason'); return;
    }

    requestPayout.mutate(
      { amount: parsedAmount, payout_type: 'EMERGENCY', reason },
      {
        onSuccess: () => setSuccess(true),
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setError(axiosErr.response?.data?.detail || 'Failed to submit request');
        },
      },
    );
  }

  if (success) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Request Submitted</h2>
        <p className="text-sm text-gray-600 mt-2">Your collector will review your emergency withdrawal request. You'll be notified when it's approved.</p>
        <Button className="mt-6" onClick={() => navigate('/client/payouts')}>View My Payouts</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Emergency Withdrawal</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Early withdrawal</p>
            <p className="text-xs text-amber-700 mt-0.5">Emergency requests are reviewed by your collector. They may take up to 24 hours to process.</p>
          </div>
        </div>
      </div>

      {balance && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 font-medium">Available Balance</p>
          <p className="text-2xl font-bold text-gray-900">GHS {balance.balance}</p>
        </div>
      )}

      <Input
        label="Amount (GHS)"
        type="number"
        step="0.01"
        min="0"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Reason for emergency withdrawal</label>
        <div className="flex flex-wrap gap-2">
          {EMERGENCY_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedReason(r)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedReason === r
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {selectedReason === 'Other' && (
        <Textarea
          label="Describe your reason"
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          placeholder="Please explain..."
          rows={3}
          maxChars={500}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button fullWidth onClick={handleSubmit} loading={requestPayout.isPending}>
        Submit Emergency Request
      </Button>
    </div>
  );
}
