export type OTPPurpose = 'REGISTER' | 'LOGIN' | 'RESET';

export interface OTPSendRequest {
  phone: string;
  purpose: OTPPurpose;
}

export interface OTPSendResponse {
  message: string;
  debug_code?: string | null;
}

export interface OTPVerifyRequest {
  phone: string;
  code: string;
  purpose: OTPPurpose;
}

export interface OTPVerifyResponse {
  verification_token: string;
}

export interface CollectorRegisterRequest {
  full_name: string;
  phone: string;
}

export interface CollectorRegisterResponse {
  message: string;
  phone: string;
}

export interface CollectorSetPinRequest {
  verification_token: string;
  pin: string;
  pin_confirm: string;
}

export interface CollectorSetPinResponse {
  message: string;
}

export interface CollectorSetMomoRequest {
  verification_token: string;
  momo_number: string;
  contribution_amount: number;
  contribution_frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface CollectorSetMomoResponse {
  message: string;
  collector_id: string;
  invite_code: string;
}

export interface CollectorLoginRequest {
  phone: string;
  pin: string;
}

export interface CollectorResetPinRequest {
  verification_token: string;
  new_pin: string;
  new_pin_confirm: string;
}

export interface ClientLoginRequest {
  phone: string;
  code: string;
}

export interface ClientJoinRequest {
  invite_code: string;
  full_name: string;
  phone: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface InviteInfoResponse {
  collector_name: string;
  invite_code: string;
}
