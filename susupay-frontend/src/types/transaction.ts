export type SubmissionType = 'SMS_TEXT' | 'SCREENSHOT';
export type TrustLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'AUTO_REJECTED';
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'QUERIED' | 'REJECTED' | 'AUTO_REJECTED';
export type Confidence = 'HIGH' | 'PARTIAL' | 'FAILED';

export interface SMSSubmitRequest {
  client_id: string;
  sms_text: string;
}

export interface ClientSMSSubmitRequest {
  sms_text: string;
}

export interface ScreenshotSubmitRequest {
  client_id: string;
  amount: number;
  screenshot: File;
}

export interface ParsedSMSResponse {
  amount: number | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  transaction_id: string | null;
  transaction_date: string | null;
  confidence: Confidence;
}

export interface ValidationFlag {
  check: string;
  passed: boolean;
  detail: string;
}

export interface SubmitResponse {
  transaction_id: string;
  status: TransactionStatus;
  trust_level: TrustLevel;
  validation_flags: ValidationFlag[];
  parsed: ParsedSMSResponse;
}

export interface TransactionFeedItem {
  id: string;
  client_id: string;
  client_name: string;
  amount: string;
  submission_type: SubmissionType;
  trust_level: TrustLevel;
  status: TransactionStatus;
  validation_flags: ValidationFlag[];
  submitted_at: string;
  confirmed_at: string | null;
  collector_note: string | null;
}

export interface QueryRequest {
  note: string;
}

export interface RejectRequest {
  note: string;
}

export interface TransactionActionResponse {
  transaction_id: string;
  status: TransactionStatus;
  confirmed_at: string | null;
}

export interface ClientTransactionItem {
  id: string;
  amount: string;
  status: TransactionStatus;
  trust_level: TrustLevel;
  submitted_at: string;
  confirmed_at: string | null;
  collector_note: string | null;
}
