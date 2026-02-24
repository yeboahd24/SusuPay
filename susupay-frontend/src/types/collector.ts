export interface CollectorProfile {
  id: string;
  full_name: string;
  phone: string;
  momo_number: string | null;
  invite_code: string;
  cycle_start_date: string | null;
  payout_interval_days: number;
  contribution_amount: string;
  contribution_frequency: string;
  is_active: boolean;
  created_at: string;
}

export interface CollectorUpdateRequest {
  full_name?: string;
  momo_number?: string;
  push_token?: string;
  cycle_start_date?: string;
  payout_interval_days?: number;
  contribution_amount?: number;
  contribution_frequency?: string;
}

export interface CollectorDashboard {
  collector_id: string;
  total_clients: number;
  active_clients: number;
  pending_transactions: number;
  total_confirmed_today: number;
  next_payout_client: string | null;
  next_payout_date: string | null;
  contribution_amount: string;
  contribution_frequency: string;
  period_label: string;
  paid_count: number;
  partial_count: number;
  unpaid_count: number;
  amount_collected: string;
  amount_expected: string;
  collection_rate: number;
}

export interface ScheduleEntry {
  client_id: string;
  full_name: string;
  payout_position: number;
  payout_date: string;
  is_current: boolean;
  is_completed: boolean;
}

export interface RotationScheduleResponse {
  cycle_start_date: string;
  payout_interval_days: number;
  cycle_length_days: number;
  current_cycle: number;
  entries: ScheduleEntry[];
}

export interface RotationPositionItem {
  client_id: string;
  position: number;
}

export interface RotationOrderRequest {
  positions: RotationPositionItem[];
}
