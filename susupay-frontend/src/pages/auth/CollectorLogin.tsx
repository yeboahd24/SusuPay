import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import { API } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { PhoneInput, isValidGhanaPhone } from '../../components/ui/PhoneInput';
import { PinInput } from '../../components/ui/PinInput';
import type { CollectorLoginRequest, TokenResponse } from '../../types/auth';
import { AxiosError } from 'axios';

export function CollectorLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidGhanaPhone(phone)) {
      setError('Enter a valid 10-digit Ghana phone number');
      return;
    }
    if (pin.length !== 4) {
      setError('Enter your 4-digit PIN');
      return;
    }

    setLoading(true);
    try {
      const payload: CollectorLoginRequest = { phone, pin };
      const { data } = await api.post<TokenResponse>(API.AUTH.COLLECTOR_LOGIN, payload);
      login(data.access_token, data.refresh_token);
      navigate('/collector/dashboard', { replace: true });
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Collector Login</h1>
        <p className="text-gray-500 mb-8">Sign in to manage your group</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <PhoneInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <PinInput
            label="PIN"
            value={pin}
            onChange={setPin}
          />

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <Button type="submit" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 space-y-3 text-center text-sm">
          <Link to="/collector/reset-pin" className="block text-primary-600 hover:text-primary-700">
            Forgot PIN?
          </Link>
          <Link to="/collector/register" className="block text-gray-500 hover:text-gray-700">
            Don't have an account? <span className="text-primary-600 font-medium">Register</span>
          </Link>
          <Link to="/" className="block text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
        </div>
      </div>
    </div>
  );
}
