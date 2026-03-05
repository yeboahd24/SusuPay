import { useTranslation } from 'react-i18next';

interface ActivityDay {
  date: string;
  paid: boolean;
}

interface ClientRow {
  client_id: string;
  full_name: string;
  days: ActivityDay[];
  paid_count: number;
  total_days: number;
}

interface Props {
  dates: string[];
  clients: ClientRow[];
}

export function ActivityHeatmap({ dates, clients }: Props) {
  const { t } = useTranslation();

  // Show last 14 days on mobile, all on desktop
  const recentDates = dates.slice(-14);
  const dateOffset = dates.length - 14;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">
        {t('collector.dashboard.clientActivity')}
      </h3>
      <p className="text-xs text-gray-400 mb-3">{t('collector.dashboard.activityDesc')}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-medium text-gray-500 pr-2 whitespace-nowrap min-w-[80px]">
                {t('client.dashboard.name')}
              </th>
              {recentDates.map((d) => (
                <th key={d} className="px-0.5 font-normal text-gray-400 text-center" style={{ minWidth: 18 }}>
                  {new Date(d).getDate()}
                </th>
              ))}
              <th className="pl-2 text-right font-medium text-gray-500 whitespace-nowrap">%</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const recentDays = client.days.slice(Math.max(dateOffset, 0));
              const rate = client.total_days > 0
                ? Math.round((client.paid_count / client.total_days) * 100)
                : 0;

              return (
                <tr key={client.client_id}>
                  <td className="pr-2 py-1 text-gray-900 truncate max-w-[100px]" title={client.full_name}>
                    {client.full_name.split(' ')[0]}
                  </td>
                  {recentDays.map((day) => (
                    <td key={day.date} className="px-0.5 py-1 text-center">
                      <div
                        className={`w-3.5 h-3.5 rounded-sm mx-auto ${
                          day.paid ? 'bg-green-500' : 'bg-gray-100'
                        }`}
                        title={`${client.full_name}: ${new Date(day.date).toLocaleDateString('en-GH', {
                          day: 'numeric',
                          month: 'short',
                        })} — ${day.paid ? 'Paid' : 'No payment'}`}
                      />
                    </td>
                  ))}
                  <td className={`pl-2 py-1 text-right font-medium ${
                    rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-500'
                  }`}>
                    {rate}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>{t('collector.dashboard.paid')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-100" />
          <span>{t('collector.dashboard.unpaid')}</span>
        </div>
      </div>
    </div>
  );
}
