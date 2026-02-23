import { useState } from 'react';
import { useMonthlySummary, useClientStatement, downloadReportPdf } from '../../hooks/useReports';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildYearOptions() {
  const current = new Date().getFullYear();
  return [current, current - 1, current - 2];
}

export function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: summary, isLoading, isError } = useMonthlySummary(year, month);
  const { data: statement, isLoading: stmtLoading } = useClientStatement(expandedClient, year, month);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadReportPdf(year, month);
    } catch {
      // silently fail — user will see no file downloaded
    } finally {
      setDownloading(false);
    }
  }

  function toggleClient(clientId: string) {
    setExpandedClient((prev) => (prev === clientId ? null : clientId));
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Monthly Reports</h1>

      {/* Month/Year selector */}
      <div className="flex gap-3">
        <select
          value={month}
          onChange={(e) => {
            setMonth(Number(e.target.value));
            setExpandedClient(null);
          }}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i + 1}>{name}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => {
            setYear(Number(e.target.value));
            setExpandedClient(null);
          }}
          className="w-28 rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {buildYearOptions().map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingSpinner className="mt-10" />}

      {isError && (
        <p className="text-sm text-red-600 text-center mt-10">Failed to load report. Try again later.</p>
      )}

      {summary && (
        <>
          {/* Summary card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 mb-3">
              {MONTH_NAMES[month - 1]} {year} Summary
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Deposits</p>
                <p className="text-lg font-bold text-green-700">GH¢ {summary.total_deposits}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Payouts</p>
                <p className="text-lg font-bold text-red-600">GH¢ {summary.total_payouts}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Balance</p>
                <p className="text-lg font-bold text-gray-900">GH¢ {summary.net_balance}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Clients</p>
                <p className="text-lg font-bold text-gray-900">{summary.client_count}</p>
              </div>
            </div>
          </div>

          {/* Download PDF */}
          <Button fullWidth variant="secondary" onClick={handleDownload} loading={downloading}>
            Download PDF Report
          </Button>

          {/* Per-client table */}
          {summary.clients.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Per-Client Breakdown</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {summary.clients.map((client) => {
                  const isExpanded = expandedClient === client.client_id;
                  return (
                    <div key={client.client_id}>
                      <button
                        onClick={() => toggleClient(client.client_id)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 text-sm">{client.client_name}</p>
                          <svg
                            className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                          <span>Deposits: {client.deposit_count} (GH¢ {client.total_deposits})</span>
                          <span>Payouts: {client.payout_count} (GH¢ {client.total_payouts})</span>
                        </div>
                        <p className="text-xs font-medium text-gray-700 mt-1">Net: GH¢ {client.net_balance}</p>
                      </button>

                      {/* Expanded statement */}
                      {isExpanded && (
                        <div className="px-4 pb-3 bg-gray-50">
                          {stmtLoading && <LoadingSpinner size="sm" className="py-4" />}
                          {statement && statement.items.length === 0 && (
                            <p className="text-xs text-gray-400 py-3 text-center">No transactions this month.</p>
                          )}
                          {statement && statement.items.length > 0 && (
                            <div className="space-y-1.5 pt-2">
                              <div className="flex justify-between text-[11px] text-gray-400 font-medium px-1">
                                <span>Date</span>
                                <span>Amount</span>
                              </div>
                              {statement.items.map((entry, i) => (
                                <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">
                                      {new Date(entry.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                                    </span>
                                    <Badge color={entry.type === 'DEPOSIT' ? 'green' : 'red'}>
                                      {entry.type}
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-medium ${entry.type === 'DEPOSIT' ? 'text-green-700' : 'text-red-600'}`}>
                                      {entry.type === 'DEPOSIT' ? '+' : '-'}GH¢ {entry.amount}
                                    </span>
                                    <p className="text-[10px] text-gray-400">Bal: GH¢ {entry.running_balance}</p>
                                  </div>
                                </div>
                              ))}
                              <div className="flex justify-between text-[11px] text-gray-500 font-medium px-1 pt-1">
                                <span>Opening: GH¢ {statement.opening_balance}</span>
                                <span>Closing: GH¢ {statement.closing_balance}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {summary.clients.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No client activity for this month.</p>
          )}
        </>
      )}
    </div>
  );
}
