import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { API } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PhoneInput, isValidGhanaPhone } from '../../components/ui/PhoneInput';
import { OtpInput } from '../../components/ui/OtpInput';
import { PinInput } from '../../components/ui/PinInput';
import type {
  CollectorRegisterRequest,
  OTPSendRequest,
  OTPSendResponse,
  OTPVerifyRequest,
  CollectorSetPinRequest,
  CollectorSetMomoRequest,
  CollectorSetMomoResponse,
} from '../../types/auth';
import { AxiosError } from 'axios';

type Step = 'info' | 'otp' | 'pin' | 'momo' | 'success';

export function CollectorRegister() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Info
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneWarning, setPhoneWarning] = useState('');
  const [checkingPhone, setCheckingPhone] = useState(false);
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2: OTP
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');

  // Step 3: PIN
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  // Debug OTP display
  const [debugCode, setDebugCode] = useState('');

  // Step 4: MoMo + Contribution
  const [momoNumber, setMomoNumber] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionFrequency, setContributionFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');

  // Step 5: Success
  const [inviteCode, setInviteCode] = useState('');

  const stepNumber = { info: 1, otp: 2, pin: 3, momo: 4, success: 5 }[step];

  // Real-time phone check with debounce
  useEffect(() => {
    setPhoneWarning('');
    if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);

    if (!isValidGhanaPhone(phone)) return;

    setCheckingPhone(true);
    phoneCheckTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(API.AUTH.CHECK_PHONE, {
          params: { phone, role: 'COLLECTOR' },
        });
        if (!data.available) {
          setPhoneWarning(data.message);
        }
      } catch {
        // Silently fail — submit will catch the real error
      } finally {
        setCheckingPhone(false);
      }
    }, 500);

    return () => {
      if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    };
  }, [phone]);

  const handleInfo = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Enter your full name (at least 2 characters)');
      return;
    }
    if (!isValidGhanaPhone(phone)) {
      setError('Enter a valid 10-digit Ghana phone number');
      return;
    }
    if (phoneWarning) {
      setError(phoneWarning);
      return;
    }

    setLoading(true);
    try {
      const registerPayload: CollectorRegisterRequest = { full_name: fullName.trim(), phone };
      await api.post(API.AUTH.COLLECTOR_REGISTER, registerPayload);

      const otpPayload: OTPSendRequest = { phone, purpose: 'REGISTER' };
      const { data: otpData } = await api.post<OTPSendResponse>(API.AUTH.OTP_SEND, otpPayload);
      if (otpData.debug_code) setDebugCode(otpData.debug_code);

      setStep('otp');
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const payload: OTPVerifyRequest = { phone, code: otp, purpose: 'REGISTER' };
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

  const handlePin = async (e: FormEvent) => {
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
      const payload: CollectorSetPinRequest = {
        verification_token: verificationToken,
        pin,
        pin_confirm: pinConfirm,
      };
      await api.post(API.AUTH.COLLECTOR_SET_PIN, payload);
      setStep('momo');
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to set PIN. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMomo = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidGhanaPhone(momoNumber)) {
      setError('Enter a valid 10-digit MoMo number');
      return;
    }
    const amount = parseFloat(contributionAmount);
    if (!contributionAmount || isNaN(amount) || amount <= 0) {
      setError('Enter a valid contribution amount');
      return;
    }

    setLoading(true);
    try {
      const payload: CollectorSetMomoRequest = {
        verification_token: verificationToken,
        momo_number: momoNumber,
        contribution_amount: amount,
        contribution_frequency: contributionFrequency,
      };
      const { data } = await api.post<CollectorSetMomoResponse>(API.AUTH.COLLECTOR_SET_MOMO, payload);
      setInviteCode(data.invite_code);
      setStep('success');
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to set MoMo number. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
        <p className="text-gray-500 mb-6">Step {stepNumber} of 5</p>

        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= stepNumber ? 'bg-primary-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {step === 'info' && (
          <form onSubmit={handleInfo} className="space-y-5">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Kwame Mensah"
            />
            <div>
              <PhoneInput
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={phoneWarning || undefined}
              />
              {checkingPhone && isValidGhanaPhone(phone) && (
                <p className="mt-1 text-xs text-gray-400">Checking availability...</p>
              )}
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <Button type="submit" fullWidth loading={loading} disabled={!!phoneWarning}>
              Continue
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtp} className="space-y-5">
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
          <form onSubmit={handlePin} className="space-y-5">
            <PinInput label="Create PIN" value={pin} onChange={setPin} />
            <PinInput label="Confirm PIN" value={pinConfirm} onChange={setPinConfirm} />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <Button type="submit" fullWidth loading={loading}>
              Set PIN
            </Button>
          </form>
        )}

        {step === 'momo' && (
          <form onSubmit={handleMomo} className="space-y-5">
            <p className="text-sm text-gray-600">
              Set up your group's payment details.
            </p>
            <PhoneInput
              label="MoMo Number"
              value={momoNumber}
              onChange={(e) => setMomoNumber(e.target.value)}
            />
            <Input
              label="Contribution Amount (GHS)"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 50"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              min="0.01"
              step="0.01"
            />
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Frequency
              </label>
              <select
                value={contributionFrequency}
                onChange={(e) => setContributionFrequency(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <Button type="submit" fullWidth loading={loading}>
              Complete Registration
            </Button>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
              <p className="text-gray-600 mb-4">
                Share this invite code with your clients so they can join your group:
              </p>
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
                <p className="text-2xl font-mono font-bold text-primary-600 tracking-widest">
                  {inviteCode}
                </p>
              </div>
            </div>
            <Button fullWidth onClick={() => navigate('/collector/login', { replace: true })}>
              Go to Login
            </Button>
          </div>
        )}

        {step !== 'success' && (
          <div className="mt-6 text-center">
            <Link to="/collector/login" className="text-sm text-gray-400 hover:text-gray-600">
              &larr; Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
