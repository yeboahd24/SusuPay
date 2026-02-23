export interface ClientSummaryItem {
  client_id: string;
  client_name: string;
  total_deposits: string;
  deposit_count: number;
  total_payouts: string;
  payout_count: number;
  net_balance: string;
}

export interface MonthlySummary {
  year: number;
  month: number;
  total_deposits: string;
  total_payouts: string;
  net_balance: string;
  client_count: number;
  clients: ClientSummaryItem[];
}

export type StatementEntryType = 'DEPOSIT' | 'PAYOUT';

export interface ClientStatementItem {
  date: string;
  type: StatementEntryType;
  description: string;
  amount: string;
  running_balance: string;
}

export interface ClientStatement {
  client_name: string;
  year: number;
  month: number;
  opening_balance: string;
  closing_balance: string;
  items: ClientStatementItem[];
}
