import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollectorProfile, useUpdateProfile } from '../../hooks/useCollector';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { LanguageSelector } from '../../components/ui/LanguageSelector';
import type { AxiosError } from 'axios';

export function Profile() {
  const { data: profile, isLoading } = useCollectorProfile();
  const updateProfile = useUpdateProfile();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMomo, setEditMomo] = useState('');
  const [editError, setEditError] = useState('');
  const [copied, setCopied] = useState(false);

  // Contribution settings
  const [editContribAmount, setEditContribAmount] = useState('');
  const [editContribFreq, setEditContribFreq] = useState('DAILY');

  function startEdit() {
    if (!profile) return;
    setEditName(profile.full_name);
    setEditMomo(profile.momo_number ?? '');
    setEditContribAmount(profile.contribution_amount);
    setEditContribFreq(profile.contribution_frequency);
    setEditError('');
    setEditing(true);
  }

  function handleSave() {
    setEditError('');
    const name = editName.trim();
    if (!name) {
      setEditError('Name is required');
      return;
    }
    const momo = editMomo.trim();
    if (momo && !/^0\d{9}$/.test(momo)) {
      setEditError('MoMo number must be a valid Ghana phone (e.g. 0244000000)');
      return;
    }
    const amount = parseFloat(editContribAmount);
    if (isNaN(amount) || amount < 0) {
      setEditError('Contribution amount must be a non-negative number');
      return;
    }

    updateProfile.mutate(
      {
        full_name: name,
        ...(momo ? { momo_number: momo } : {}),
        contribution_amount: amount,
        contribution_frequency: editContribFreq,
      },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setEditError(axiosErr.response?.data?.detail || 'Failed to update profile');
        },
      },
    );
  }

  function copyInviteCode() {
    if (!profile?.invite_code) return;
    navigator.clipboard.writeText(profile.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const freqLabel = (f: string) => f === 'DAILY' ? 'Daily' : f === 'WEEKLY' ? 'Weekly' : 'Monthly';

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  if (!profile) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-gray-600">Could not load profile.</p>
        <Button variant="secondary" fullWidth onClick={logout}>
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      {/* Profile info / edit */}
      {editing ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <Input label="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="MoMo Number" value={editMomo} onChange={(e) => setEditMomo(e.target.value)} placeholder="0244000000" />
          <Input
            label="Contribution Amount (GHS)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={editContribAmount}
            onChange={(e) => setEditContribAmount(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contribution Frequency</label>
            <select
              value={editContribFreq}
              onChange={(e) => setEditContribFreq(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} loading={updateProfile.isPending}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold text-gray-900">{profile.full_name}</h2>
            <button onClick={startEdit} className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Edit
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-900">{profile.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">MoMo Number</span>
              <span className="font-medium text-gray-900">{profile.momo_number ?? 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Contribution</span>
              <span className="font-medium text-gray-900">
                GHS {parseFloat(profile.contribution_amount).toFixed(2)} / {freqLabel(profile.contribution_frequency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Member Since</span>
              <span className="font-medium text-gray-900">
                {new Date(profile.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Invite code */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
        <p className="text-xs text-primary-600 font-medium mb-1">Your Invite Code</p>
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-primary-800 font-mono">{profile.invite_code}</p>
          <button
            onClick={copyInviteCode}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg bg-white border border-primary-200"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Join my susu group on SusuPay! Use invite code: ${profile.invite_code}\n\n${window.location.origin}/join/${profile.invite_code}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#20bd5a]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Share via WhatsApp
          </a>
        </div>
      </div>

      {/* Grow Your Network */}
      <button
        onClick={() => navigate('/collector/referrals')}
        className="w-full bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900 text-sm">Grow Your Network</p>
            <p className="text-xs text-gray-500 mt-0.5">Share via WhatsApp, referrals & more</p>
          </div>
        </div>
        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Monthly Reports */}
      <button
        onClick={() => navigate('/collector/reports')}
        className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="font-medium text-gray-900 text-sm">Monthly Reports</p>
          <p className="text-xs text-gray-500 mt-0.5">View summaries and download PDFs</p>
        </div>
        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Language selector */}
      <LanguageSelector />

      {/* Sign out */}
      <Button variant="secondary" fullWidth onClick={logout}>
        Sign Out
      </Button>
    </div>
  );
}
