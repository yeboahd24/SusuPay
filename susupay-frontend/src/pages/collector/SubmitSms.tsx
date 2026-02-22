import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../../hooks/useCollector';
import { useSubmitSms } from '../../hooks/useTransactions';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Badge, statusBadgeColor } from '../../components/ui/Badge';
import { ValidationFlags } from '../../components/transaction/ValidationFlags';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { SubmitResponse } from '../../types/transaction';
import type { AxiosError } from 'axios';

export function SubmitSms() {
  const navigate = useNavigate();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const submitSms = useSubmitSms();

  const [clientId, setClientId] = useState('');
  const [smsText, setSmsText] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<SubmitResponse | null>(null);

  function handleSubmit() {
    setError('');

    if (!clientId) {
      setError('Please select a client');
      return;
    }
    const trimmed = smsText.trim();
    if (trimmed.length < 10) {
      setError('SMS text must be at least 10 characters');
      return;
    }
    if (trimmed.length > 2000) {
      setError('SMS text must be 2000 characters or less');
      return;
    }

    submitSms.mutate(
      { client_id: clientId, sms_text: trimmed },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setError(axiosErr.response?.data?.detail || 'Failed to submit SMS');
        },
      },
    );
  }

  function handleReset() {
    setClientId('');
    setSmsText('');
    setResult(null);
    setError('');
  }

  if (clientsLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  // Show result after successful submission
  if (result) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Submission Result</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge color={statusBadgeColor(result.status)}>{result.status}</Badge>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              result.trust_level === 'HIGH' ? 'text-green-600 bg-green-50' :
              result.trust_level === 'MEDIUM' ? 'text-amber-600 bg-amber-50' :
              'text-red-600 bg-red-50'
            }`}>
              Trust: {result.trust_level}
            </span>
          </div>

          {/* Parsed SMS details */}
          {result.parsed && (
            <div className="space-y-1 text-sm">
              {result.parsed.amount != null && (
                <p><span className="text-gray-500">Amount:</span> GHS {result.parsed.amount}</p>
              )}
              {result.parsed.recipient_name && (
                <p><span className="text-gray-500">Recipient:</span> {result.parsed.recipient_name}</p>
              )}
              {result.parsed.recipient_phone && (
                <p><span className="text-gray-500">Phone:</span> {result.parsed.recipient_phone}</p>
              )}
              {result.parsed.transaction_id && (
                <p><span className="text-gray-500">Txn ID:</span> {result.parsed.transaction_id}</p>
              )}
              {result.parsed.transaction_date && (
                <p><span className="text-gray-500">Date:</span> {result.parsed.transaction_date}</p>
              )}
              <p><span className="text-gray-500">Confidence:</span> {result.parsed.confidence}</p>
            </div>
          )}

          <ValidationFlags flags={result.validation_flags} />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleReset} fullWidth>
            Submit Another
          </Button>
          <Button onClick={() => navigate('/collector/transactions')} fullWidth>
            View Transactions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Submit SMS</h1>
      <p className="text-sm text-gray-500">
        Paste the MoMo confirmation SMS received from a client's payment.
      </p>

      {/* Client selector */}
      <div className="w-full">
        <label htmlFor="client-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Client
        </label>
        <select
          id="client-select"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary-500 focus:ring-primary-500"
        >
          <option value="">Choose a client...</option>
          {clients
            ?.filter((c) => c.is_active)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} — {c.phone}
              </option>
            ))}
        </select>
      </div>

      {/* SMS text input */}
      <Textarea
        label="SMS Text"
        placeholder="Paste the MTN MoMo confirmation SMS here..."
        rows={6}
        maxChars={2000}
        value={smsText}
        onChange={(e) => setSmsText(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleSubmit} loading={submitSms.isPending} fullWidth>
        Submit
      </Button>
    </div>
  );
}
