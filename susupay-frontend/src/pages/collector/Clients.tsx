import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClients, useCollectorProfile } from '../../hooks/useCollector';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';

export function Clients() {
  const { data: clients, isLoading } = useClients();
  const { data: profile } = useCollectorProfile();
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const filtered = clients?.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  function copyInviteCode() {
    if (!profile?.invite_code) return;
    navigator.clipboard.writeText(profile.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Clients</h1>

      {/* Invite code banner */}
      {profile?.invite_code && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-primary-600 font-medium">Invite Code</p>
            <p className="text-lg font-bold text-primary-800 font-mono">{profile.invite_code}</p>
          </div>
          <button
            onClick={copyInviteCode}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg bg-white border border-primary-200"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search clients..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary-500 focus:ring-primary-500"
      />

      {/* Client list */}
      {!filtered?.length ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
          title={search ? 'No clients match your search' : 'No clients yet'}
          subtitle={search ? undefined : 'Share your invite code to get started'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => (
            <Link
              key={client.id}
              to={`/collector/clients/${client.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {client.payout_position !== null && (
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {client.payout_position}
                      </span>
                    )}
                    <p className="font-semibold text-gray-900">{client.full_name}</p>
                    {!client.is_active && <Badge color="red">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-gray-500">{client.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">GHS {client.daily_amount}/day</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className="text-lg font-bold text-gray-900">GHS {client.balance}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
