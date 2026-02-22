import { useState, type FormEvent } from 'react';
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

  // Step 2: OTP
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');

  // Step 3: PIN
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  // Debug OTP display
  const [debugCode, setDebugCode] = useState('');

  // Step 4: MoMo
  const [momoNumber, setMomoNumber] = useState('');

  // Step 5: Success
  const [inviteCode, setInviteCode] = useState('');

  const stepNumber = { info: 1, otp: 2, pin: 3, momo: 4, success: 5 }[step];

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

    setLoading(true);
    try {
      const payload: CollectorSetMomoRequest = {
        verification_token: verificationToken,
        momo_number: momoNumber,
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
            <PhoneInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <Button type="submit" fullWidth loading={loading}>
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
              Enter the MoMo number where clients will send payments. This is used to validate transactions.
            </p>
            <PhoneInput
              label="MoMo Number"
              value={momoNumber}
              onChange={(e) => setMomoNumber(e.target.value)}
            />
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
