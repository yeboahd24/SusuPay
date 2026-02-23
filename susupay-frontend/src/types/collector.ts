export interface CollectorProfile {
  id: string;
  full_name: string;
  phone: string;
  momo_number: string | null;
  invite_code: string;
  cycle_start_date: string | null;
  payout_interval_days: number;
  is_active: boolean;
  created_at: string;
}

export interface CollectorUpdateRequest {
  full_name?: string;
  momo_number?: string;
  push_token?: string;
  cycle_start_date?: string;
  payout_interval_days?: number;
}

export interface CollectorDashboard {
  collector_id: string;
  total_clients: number;
  active_clients: number;
  pending_transactions: number;
  total_confirmed_today: number;
  next_payout_client: string | null;
  next_payout_date: string | null;
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
