import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { API } from '../api/endpoints';
import type { MonthlySummary, ClientStatement } from '../types/report';

export function useMonthlySummary(year: number, month: number) {
  return useQuery<MonthlySummary>({
    queryKey: ['reports', 'monthly', year, month],
    queryFn: async () => {
      const { data } = await api.get(API.REPORTS.MONTHLY_SUMMARY, {
        params: { year, month },
      });
      return data;
    },
  });
}

export function useClientStatement(clientId: string | null, year: number, month: number) {
  return useQuery<ClientStatement>({
    queryKey: ['reports', 'client-statement', clientId, year, month],
    queryFn: async () => {
      const { data } = await api.get(API.REPORTS.CLIENT_STATEMENT(clientId!), {
        params: { year, month },
      });
      return data;
    },
    enabled: !!clientId,
  });
}

export async function downloadReportPdf(year: number, month: number) {
  const response = await api.get(API.REPORTS.MONTHLY_PDF, {
    params: { year, month },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SusuPay_Report_${year}_${String(month).padStart(2, '0')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
