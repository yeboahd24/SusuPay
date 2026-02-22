export type PayoutType = 'SCHEDULED' | 'EMERGENCY';
export type PayoutStatus = 'REQUESTED' | 'APPROVED' | 'DECLINED' | 'COMPLETED';

export interface PayoutRequest {
  amount: number;
  payout_type: PayoutType;
  reason?: string;
}

export interface PayoutDeclineRequest {
  reason: string;
}

export interface PayoutResponse {
  id: string;
  collector_id: string;
  client_id: string;
  amount: string;
  payout_type: PayoutType;
  status: PayoutStatus;
  reason: string | null;
  requested_at: string;
  approved_at: string | null;
  completed_at: string | null;
}

export interface PayoutListItem {
  id: string;
  client_id: string;
  client_name: string;
  amount: string;
  payout_type: PayoutType;
  status: PayoutStatus;
  reason: string | null;
  requested_at: string;
  approved_at: string | null;
  completed_at: string | null;
}

export interface ClientPayoutItem {
  id: string;
  amount: string;
  payout_type: PayoutType;
  status: PayoutStatus;
  reason: string | null;
  requested_at: string;
  approved_at: string | null;
  completed_at: string | null;
}
