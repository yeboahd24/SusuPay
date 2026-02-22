export interface ClientProfile {
  id: string;
  collector_id: string;
  full_name: string;
  phone: string;
  daily_amount: string;
  is_active: boolean;
  joined_at: string;
}

export interface ClientUpdateRequest {
  full_name?: string;
  daily_amount?: number;
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
  daily_amount: string;
  is_active: boolean;
  joined_at: string;
  balance: string;
}

export interface GroupMemberItem {
  id: string;
  full_name: string;
  daily_amount: string;
  total_deposits: string;
  transaction_count: number;
  balance: string;
}
