import { useState, useEffect } from 'react';
import { useClients, useCollectorProfile, useUpdateProfile, useSchedule, useSetRotationOrder } from '../../hooks/useCollector';
import { Button } from '../../components/ui/Button';
import { DatePicker } from '../../components/ui/DatePicker';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import type { ClientListItem } from '../../types/client';

const INTERVAL_OPTIONS = [
  { label: 'Weekly', value: 7 },
  { label: 'Bi-weekly', value: 14 },
  { label: 'Monthly', value: 30 },
  { label: 'Custom', value: 0 },
];

export function CollectorSchedule() {
  const { data: profile, isLoading: profileLoading } = useCollectorProfile();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const schedule = useSchedule();
  const updateProfile = useUpdateProfile();
  const setOrder = useSetRotationOrder();

  const [startDate, setStartDate] = useState('');
  const [intervalDays, setIntervalDays] = useState(7);
  const [customInterval, setCustomInterval] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [orderedClients, setOrderedClients] = useState<ClientListItem[]>([]);
  const [unpositioned, setUnpositioned] = useState<ClientListItem[]>([]);
  const [configSaved, setConfigSaved] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setStartDate(profile.cycle_start_date ?? '');
      const interval = profile.payout_interval_days;
      const preset = INTERVAL_OPTIONS.find((o) => o.value === interval && o.value !== 0);
      if (preset) {
        setIntervalDays(interval);
        setIsCustom(false);
      } else {
        setIsCustom(true);
        setCustomInterval(String(interval));
        setIntervalDays(interval);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!clients) return;
    const active = clients.filter((c) => c.is_active);
    const positioned = active
      .filter((c) => c.payout_position !== null)
      .sort((a, b) => (a.payout_position ?? 0) - (b.payout_position ?? 0));
    const unpos = active.filter((c) => c.payout_position === null);
    setOrderedClients(positioned);
    setUnpositioned(unpos);
  }, [clients]);

  const dateMap = new Map<string, { payout_date: string; is_current: boolean; is_completed: boolean }>();
  if (schedule.data) {
    for (const entry of schedule.data.entries) {
      dateMap.set(entry.client_id, {
        payout_date: entry.payout_date,
        is_current: entry.is_current,
        is_completed: entry.is_completed,
      });
    }
  }

  function handleIntervalSelect(value: number) {
    if (value === 0) {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      setIntervalDays(value);
    }
  }

  async function saveConfig() {
    const interval = isCustom ? parseInt(customInterval) : intervalDays;
    if (!startDate || !interval || interval < 1) return;
    await updateProfile.mutateAsync({
      cycle_start_date: startDate,
      payout_interval_days: interval,
    });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const arr = [...orderedClients];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    setOrderedClients(arr);
  }

  function moveDown(index: number) {
    if (index === orderedClients.length - 1) return;
    const arr = [...orderedClients];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    setOrderedClients(arr);
  }

  function addClient(client: ClientListItem) {
    setOrderedClients((prev) => [...prev, client]);
    setUnpositioned((prev) => prev.filter((c) => c.id !== client.id));
  }

  function removeClient(index: number) {
    const removed = orderedClients[index];
    setOrderedClients((prev) => prev.filter((_, i) => i !== index));
    setUnpositioned((prev) => [...prev, removed].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }

  async function saveOrder() {
    const positions = orderedClients.map((c, i) => ({
      client_id: c.id,
      position: i + 1,
    }));
    await setOrder.mutateAsync({ positions });
    setOrderSaved(true);
    setTimeout(() => setOrderSaved(false), 2000);
  }

  if (profileLoading || clientsLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  return (
    <div className="p-4 pb-24 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Payout Schedule</h1>

      {/* Two-column on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cycle configuration */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4 h-fit">
          <h2 className="text-base font-semibold text-gray-900">Cycle Settings</h2>

          <DatePicker
            label="Cycle Start Date"
            value={startDate}
            onChange={setStartDate}
            placeholder="Pick a start date"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payout Interval</label>
            <div className="grid grid-cols-2 gap-2">
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleIntervalSelect(opt.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    (opt.value === 0 && isCustom) || (!isCustom && intervalDays === opt.value)
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {isCustom && (
              <input
                type="number"
                placeholder="Days between payouts"
                min={1}
                max={365}
                value={customInterval}
                onChange={(e) => {
                  setCustomInterval(e.target.value);
                  const v = parseInt(e.target.value);
                  if (v > 0) setIntervalDays(v);
                }}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary-500 focus:ring-primary-500"
              />
            )}
          </div>

          <Button
            onClick={saveConfig}
            loading={updateProfile.isPending}
            disabled={!startDate}
            fullWidth
          >
            {configSaved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>

        {/* Rotation order */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Rotation Order</h2>

          {orderedClients.length === 0 && unpositioned.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              }
              title="No clients yet"
              subtitle="Add clients to your group to set up a rotation order"
            />
          ) : (
            <>
              {/* Positioned list */}
              {orderedClients.length > 0 && (
                <div className="space-y-2">
                  {orderedClients.map((client, index) => {
                    const info = dateMap.get(client.id);
                    return (
                      <div
                        key={client.id}
                        className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border ${
                          info?.is_current
                            ? 'border-primary-300 bg-primary-50'
                            : info?.is_completed
                            ? 'border-gray-200 bg-gray-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${info?.is_completed ? 'text-gray-400' : 'text-gray-900'}`}>
                            {client.full_name}
                          </p>
                          {info && (
                            <p className="text-xs text-gray-500">
                              {new Date(info.payout_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {info.is_current && <span className="ml-1 text-primary-600 font-medium">Current</span>}
                              {info.is_completed && <span className="ml-1 text-gray-400">Done</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                          <button
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveDown(index)}
                            disabled={index === orderedClients.length - 1}
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeClient(index)}
                            className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 ml-0.5 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unpositioned clients */}
              {unpositioned.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Not in rotation</p>
                  <div className="space-y-2">
                    {unpositioned.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50"
                      >
                        <span className="text-sm text-gray-600 truncate mr-2">{client.full_name}</span>
                        <button
                          onClick={() => addClient(client)}
                          className="shrink-0 text-xs font-medium text-primary-600 hover:text-primary-700 px-2.5 py-1.5 rounded-lg bg-primary-50 border border-primary-200 hover:bg-primary-100 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={saveOrder}
                loading={setOrder.isPending}
                disabled={orderedClients.length === 0}
                fullWidth
              >
                {orderSaved ? 'Saved!' : 'Save Order'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
