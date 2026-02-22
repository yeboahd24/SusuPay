import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import { API } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PhoneInput, isValidGhanaPhone } from '../../components/ui/PhoneInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { InviteInfoResponse, ClientJoinRequest, TokenResponse } from '../../types/auth';
import { AxiosError } from 'axios';

export function ClientJoin() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState('');
  const [collectorName, setCollectorName] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dailyAmount, setDailyAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteCode) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get<InviteInfoResponse>(API.AUTH.INVITE_INFO(inviteCode));
        if (!cancelled) {
          setCollectorName(data.collector_name);
        }
      } catch {
        if (!cancelled) {
          setInviteError('Invalid or expired invite code');
        }
      } finally {
        if (!cancelled) {
          setInviteLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [inviteCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Enter your full name');
      return;
    }
    if (!isValidGhanaPhone(phone)) {
      setError('Enter a valid 10-digit Ghana phone number');
      return;
    }
    const amount = parseFloat(dailyAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid daily amount');
      return;
    }

    setLoading(true);
    try {
      const payload: ClientJoinRequest = {
        invite_code: inviteCode!,
        full_name: fullName.trim(),
        phone,
        daily_amount: amount,
      };
      const { data } = await api.post<TokenResponse>(API.AUTH.CLIENT_JOIN, payload);
      login(data.access_token, data.refresh_token);
      navigate('/client/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to join group. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (inviteLoading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-6">{inviteError}</p>
          <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Join Susu Group</h1>
        <p className="text-gray-500 mb-8">
          You've been invited by <strong className="text-primary-600">{collectorName}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ama Serwaa"
          />
          <PhoneInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Daily Contribution (GHS)"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={dailyAmount}
            onChange={(e) => setDailyAmount(e.target.value)}
            placeholder="5.00"
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <Button type="submit" fullWidth loading={loading}>
            Join Group
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
        </div>
      </div>
    </div>
  );
}
