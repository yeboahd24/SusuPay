export interface CollectorProfile {
  id: string;
  full_name: string;
  phone: string;
  momo_number: string | null;
  invite_code: string;
  is_active: boolean;
  created_at: string;
}

export interface CollectorUpdateRequest {
  full_name?: string;
  momo_number?: string;
  push_token?: string;
}

export interface CollectorDashboard {
  collector_id: string;
  total_clients: number;
  active_clients: number;
  pending_transactions: number;
  total_confirmed_today: number;
}
