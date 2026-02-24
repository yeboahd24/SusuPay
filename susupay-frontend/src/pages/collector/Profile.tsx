import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollectorProfile, useUpdateProfile } from '../../hooks/useCollector';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
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
        <p className="text-xs text-primary-500 mt-2">
          Share this code with clients so they can join your group.
        </p>
      </div>

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

      {/* Sign out */}
      <Button variant="secondary" fullWidth onClick={logout}>
        Sign Out
      </Button>
    </div>
  );
}
