import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import { API } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { PhoneInput, isValidGhanaPhone } from '../../components/ui/PhoneInput';
import { OtpInput } from '../../components/ui/OtpInput';
import { PinInput } from '../../components/ui/PinInput';
import type {
  OTPSendRequest,
  OTPSendResponse,
  OTPVerifyRequest,
  CollectorResetPinRequest,
  TokenResponse,
} from '../../types/auth';
import { AxiosError } from 'axios';

type Step = 'phone' | 'otp' | 'pin';

export function ResetPin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidGhanaPhone(phone)) {
      setError('Enter a valid 10-digit Ghana phone number');
      return;
    }

    setLoading(true);
    try {
      const payload: OTPSendRequest = { phone, purpose: 'RESET' };
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
      const payload: OTPVerifyRequest = { phone, code: otp, purpose: 'RESET' };
      const { data } = await api.post(API.AUTH.OTP_VERIFY, payload);
      setVerificationToken(data.verification_token);
      setStep('pin');
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 4) {
      setError('Enter a 4-digit PIN');
      return;
    }
    if (pin !== pinConfirm) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      const payload: CollectorResetPinRequest = {
        verification_token: verificationToken,
        new_pin: pin,
        new_pin_confirm: pinConfirm,
      };
      const { data } = await api.post<TokenResponse>(API.AUTH.COLLECTOR_RESET_PIN, payload);
      login(data.access_token, data.refresh_token);
      navigate('/collector/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('PIN reset failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const stepNumber = { phone: 1, otp: 2, pin: 3 }[step];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset PIN</h1>
        <p className="text-gray-500 mb-6">Step {stepNumber} of 3</p>

        <div className="flex gap-1 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= stepNumber ? 'bg-primary-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

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
              Verify
            </Button>
          </form>
        )}

        {step === 'pin' && (
          <form onSubmit={handleResetPin} className="space-y-5">
            <PinInput label="New PIN" value={pin} onChange={setPin} />
            <PinInput label="Confirm PIN" value={pinConfirm} onChange={setPinConfirm} />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <Button type="submit" fullWidth loading={loading}>
              Reset PIN
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/collector/login" className="text-sm text-gray-400 hover:text-gray-600">
            &larr; Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
