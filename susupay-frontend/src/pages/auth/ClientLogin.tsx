import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import { API } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { PhoneInput, isValidGhanaPhone } from '../../components/ui/PhoneInput';
import { OtpInput } from '../../components/ui/OtpInput';
import type { OTPSendRequest, OTPSendResponse, ClientLoginRequest, TokenResponse } from '../../types/auth';
import { AxiosError } from 'axios';

type Step = 'phone' | 'otp';

export function ClientLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidGhanaPhone(phone)) {
      setError('Enter a valid 10-digit Ghana phone number');
      return;
    }

    setLoading(true);
    try {
      const payload: OTPSendRequest = { phone, purpose: 'LOGIN' };
      const { data } = await api.post<OTPSendResponse>(API.AUTH.OTP_SEND, payload);
      if (data.debug_code) setDebugCode(data.debug_code);
      setStep('otp');
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const payload: ClientLoginRequest = { phone, code: otp };
      const { data } = await api.post<TokenResponse>(API.AUTH.CLIENT_LOGIN, payload);
      login(data.access_token, data.refresh_token);
      navigate('/client/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Client Login</h1>
        <p className="text-gray-500 mb-8">Check your savings balance</p>

        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <PhoneInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <Button type="submit" fullWidth loading={loading}>
              Send OTP
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <p className="text-sm text-gray-600 text-center">
              Enter the 6-digit code sent to <strong>{phone}</strong>
            </p>
            {debugCode && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-center">
                <p className="text-xs text-amber-600 font-medium">DEBUG MODE</p>
                <p className="text-2xl font-mono font-bold text-amber-700 tracking-widest">{debugCode}</p>
              </div>
            )}
            <OtpInput value={otp} onChange={setOtp} />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <Button type="submit" fullWidth loading={loading}>
              Verify & Sign In
            </Button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Change phone number
            </button>
          </form>
        )}

        {/* Join with invite code */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          {showJoin ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 text-center">Enter your collector's invite code</p>
              <Input
                placeholder="e.g. dominic-yeboah-f95a"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
              <Button
                fullWidth
                variant="secondary"
                onClick={() => {
                  const code = inviteCode.trim();
                  if (code) navigate(`/join/${code}`);
                }}
                disabled={!inviteCode.trim()}
              >
                Join Group
              </Button>
              <button
                type="button"
                onClick={() => { setShowJoin(false); setInviteCode(''); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-500">New here?</p>
              <button
                type="button"
                onClick={() => setShowJoin(true)}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Join with invite code
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
        </div>
      </div>
    </div>
  );
}
