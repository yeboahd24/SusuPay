import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientProfile, useUpdateClientProfile } from '../../hooks/useClient';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { LanguageSelector } from '../../components/ui/LanguageSelector';
import type { AxiosError } from 'axios';

export function ClientProfile() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useClientProfile();
  const updateProfile = useUpdateClientProfile();
  const { logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');

  function startEdit() {
    if (!profile) return;
    setEditName(profile.full_name);
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

    updateProfile.mutate(
      { full_name: name },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => {
          const axiosErr = err as AxiosError<{ detail: string }>;
          setEditError(axiosErr.response?.data?.detail || 'Failed to update profile');
        },
      },
    );
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

      {editing ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <Input label="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
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
              <span className="text-gray-500">Contribution</span>
              <span className="font-medium text-gray-900">
                GHS {parseFloat(profile.contribution_amount).toFixed(2)} / {freqLabel(profile.contribution_frequency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`font-medium ${profile.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Joined</span>
              <span className="font-medium text-gray-900">
                {new Date(profile.joined_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Announcements */}
      <button
        onClick={() => navigate('/client/announcements')}
        className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900 text-sm">Announcements</p>
            <p className="text-xs text-gray-500 mt-0.5">Messages from your collector</p>
          </div>
        </div>
        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Rate Collector */}
      <button
        onClick={() => navigate('/client/rate')}
        className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900 text-sm">Rate Your Collector</p>
            <p className="text-xs text-gray-500 mt-0.5">Share your experience</p>
          </div>
        </div>
        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Emergency Withdrawal */}
      <button
        onClick={() => navigate('/client/emergency')}
        className="w-full bg-red-50 rounded-xl border border-red-200 p-4 flex items-center justify-between hover:bg-red-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900 text-sm">Emergency Withdrawal</p>
            <p className="text-xs text-gray-500 mt-0.5">Request early access to your savings</p>
          </div>
        </div>
        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Language selector */}
      <LanguageSelector />

      <Button variant="secondary" fullWidth onClick={logout}>
        Sign Out
      </Button>
    </div>
  );
}
