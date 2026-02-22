import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientSubmitSms, useClientSubmitScreenshot } from '../../hooks/useClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge, statusBadgeColor } from '../../components/ui/Badge';
import { ValidationFlags } from '../../components/transaction/ValidationFlags';
import type { SubmitResponse } from '../../types/transaction';
import type { AxiosError } from 'axios';

type Tab = 'sms' | 'screenshot';

export function SubmitPayment() {
  const navigate = useNavigate();
  const submitSms = useClientSubmitSms();
  const submitScreenshot = useClientSubmitScreenshot();

  const [tab, setTab] = useState<Tab>('sms');
  const [smsText, setSmsText] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmitSms() {
    setError('');
    const trimmed = smsText.trim();
    if (trimmed.length < 10) { setError('SMS text must be at least 10 characters'); return; }
    if (trimmed.length > 2000) { setError('SMS text must be 2000 characters or less'); return; }

    submitSms.mutate(
      { sms_text: trimmed },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setError(axiosErr.response?.data?.detail || 'Failed to submit SMS');
        },
      },
    );
  }

  function handleSubmitScreenshot() {
    setError('');
    if (!file) { setError('Please select a screenshot'); return; }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    // Validate file type and size
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPEG and PNG images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB');
      return;
    }

    submitScreenshot.mutate(
      { amount: parsedAmount, screenshot: file },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setError(axiosErr.response?.data?.detail || 'Failed to submit screenshot');
        },
      },
    );
  }

  function handleReset() {
    setSmsText('');
    setAmount('');
    setFile(null);
    setResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const isBusy = submitSms.isPending || submitScreenshot.isPending;

  // Success result view
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

          {result.parsed && (
            <div className="space-y-1 text-sm">
              {result.parsed.amount != null && (
                <p><span className="text-gray-500">Amount:</span> GHS {result.parsed.amount}</p>
              )}
              {result.parsed.recipient_name && (
                <p><span className="text-gray-500">Recipient:</span> {result.parsed.recipient_name}</p>
              )}
              {result.parsed.transaction_id && (
                <p><span className="text-gray-500">Txn ID:</span> {result.parsed.transaction_id}</p>
              )}
              <p><span className="text-gray-500">Confidence:</span> {result.parsed.confidence}</p>
            </div>
          )}

          <ValidationFlags flags={result.validation_flags} />
        </div>

        <p className="text-sm text-gray-500 text-center">
          Your collector will review and confirm this transaction.
        </p>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleReset} fullWidth>
            Submit Another
          </Button>
          <Button onClick={() => navigate('/client/history')} fullWidth>
            View History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Submit Payment</h1>
      <p className="text-sm text-gray-500">
        Send proof of your MoMo payment for your collector to verify.
      </p>

      {/* Tab switcher */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => { setTab('sms'); setError(''); }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'sms' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          Paste SMS
        </button>
        <button
          onClick={() => { setTab('screenshot'); setError(''); }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'screenshot' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          Upload Screenshot
        </button>
      </div>

      {/* SMS tab */}
      {tab === 'sms' && (
        <div className="space-y-4">
          <Textarea
            label="MoMo Confirmation SMS"
            placeholder="Paste the MTN MoMo confirmation message here..."
            rows={6}
            maxChars={2000}
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleSubmitSms} loading={submitSms.isPending} disabled={isBusy} fullWidth>
            Submit SMS
          </Button>
        </div>
      )}

      {/* Screenshot tab */}
      {tab === 'screenshot' && (
        <div className="space-y-4">
          <Input
            label="Amount (GHS)"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 10.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenshot
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            <p className="mt-1 text-xs text-gray-400">JPEG or PNG, max 5MB</p>
          </div>

          {file && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(0)} KB)
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleSubmitScreenshot} loading={submitScreenshot.isPending} disabled={isBusy} fullWidth>
            Upload Screenshot
          </Button>
        </div>
      )}
    </div>
  );
}
