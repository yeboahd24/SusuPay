export interface ClientProfile {
  id: string;
  collector_id: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  joined_at: string;
  contribution_amount: string;
  contribution_frequency: string;
}

export interface ClientUpdateRequest {
  full_name?: string;
  push_token?: string;
}

export interface ClientBalance {
  client_id: string;
  full_name: string;
  total_deposits: string;
  total_payouts: string;
  balance: string;
}

export interface ClientListItem {
  id: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  joined_at: string;
  balance: string;
  payout_position: number | null;
  period_paid: string;
  period_expected: string;
  period_status: string;
}

export interface GroupMemberItem {
  id: string;
  full_name: string;
  total_deposits: string;
  transaction_count: number;
  balance: string;
  payout_position: number | null;
  payout_date: string | null;
  period_paid: string;
  period_status: string;
}

export interface ClientScheduleSummary {
  has_schedule: boolean;
  my_position: number | null;
  my_payout_date: string | null;
  days_until_my_payout: number | null;
  current_recipient_name: string | null;
  next_recipient_name: string | null;
  total_positions: number;
  payout_interval_days: number;
}
