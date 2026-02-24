export interface PeriodClientStatus {
  client_id: string;
  full_name: string;
  expected: string;
  paid: string;
  remaining: string;
  status: string;
}

export interface DailyCollectionPoint {
  date: string;
  amount: string;
}

export interface TrustDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface TopContributor {
  client_id: string;
  full_name: string;
  total_deposits: string;
  transaction_count: number;
}

export interface CollectorAnalytics {
  period_label: string;
  period_start: string;
  period_end: string;
  contribution_amount: string;
  contribution_frequency: string;
  paid_count: number;
  partial_count: number;
  unpaid_count: number;
  overpaid_count: number;
  amount_collected: string;
  amount_expected: string;
  collection_rate: number;
  defaulters: PeriodClientStatus[];
  partial_payers: PeriodClientStatus[];
  daily_trend: DailyCollectionPoint[];
  trust_distribution: TrustDistribution;
  top_contributors: TopContributor[];
  group_health_score: number;
}

export interface ClientPeriodStatus {
  period_label: string;
  expected: string;
  paid: string;
  remaining: string;
  status: string;
}

export interface ClientAnalytics {
  period_status: ClientPeriodStatus;
  payment_streak: number;
  monthly_deposits: string;
  monthly_expected: string;
  monthly_compliance: number;
  group_paid_count: number;
  group_total_count: number;
}
