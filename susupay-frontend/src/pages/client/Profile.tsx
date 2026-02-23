import { useState } from 'react';
import { useClientProfile, useUpdateClientProfile } from '../../hooks/useClient';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { AxiosError } from 'axios';

export function ClientProfile() {
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
              <span className="text-gray-500">Daily Amount</span>
              <span className="font-medium text-gray-900">GHS {profile.daily_amount}</span>
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

      <Button variant="secondary" fullWidth onClick={logout}>
        Sign Out
      </Button>
    </div>
  );
}
