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
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join my susu group on SusuPay! Use invite code: ${profile.invite_code}\n\nhttps://susupay.app/join/${profile.invite_code}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-medium text-white px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a]"
              title="Share via WhatsApp"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            <button
              onClick={copyInviteCode}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg bg-white border border-primary-200"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
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
                  {/* Period status */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${
                      client.period_status === 'PAID' || client.period_status === 'OVERPAID'
                        ? 'bg-green-500'
                        : client.period_status === 'PARTIAL'
                        ? 'bg-amber-500'
                        : 'bg-red-400'
                    }`} />
                    <span className={`text-xs font-medium ${
                      client.period_status === 'PAID' || client.period_status === 'OVERPAID'
                        ? 'text-green-600'
                        : client.period_status === 'PARTIAL'
                        ? 'text-amber-600'
                        : 'text-red-500'
                    }`}>
                      {client.period_status === 'PAID' || client.period_status === 'OVERPAID'
                        ? `Paid GHS ${parseFloat(client.period_paid).toFixed(2)}`
                        : client.period_status === 'PARTIAL'
                        ? `GHS ${parseFloat(client.period_paid).toFixed(2)} of ${parseFloat(client.period_expected).toFixed(2)}`
                        : 'Unpaid'}
                    </span>
                  </div>
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
