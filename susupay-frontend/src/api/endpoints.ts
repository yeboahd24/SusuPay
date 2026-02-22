const BASE = '/api/v1';

export const API = {
  AUTH: {
    OTP_SEND: `${BASE}/auth/otp/send`,
    OTP_VERIFY: `${BASE}/auth/otp/verify`,
    COLLECTOR_REGISTER: `${BASE}/auth/collector/register`,
    COLLECTOR_SET_PIN: `${BASE}/auth/collector/set-pin`,
    COLLECTOR_SET_MOMO: `${BASE}/auth/collector/set-momo`,
    COLLECTOR_LOGIN: `${BASE}/auth/collector/login`,
    COLLECTOR_RESET_PIN: `${BASE}/auth/collector/reset-pin`,
    INVITE_INFO: (code: string) => `${BASE}/auth/invite/${code}`,
    CLIENT_JOIN: `${BASE}/auth/client/join`,
    CLIENT_LOGIN: `${BASE}/auth/client/login`,
    REFRESH: `${BASE}/auth/refresh`,
  },
  COLLECTORS: {
    ME: `${BASE}/collectors/me`,
    DASHBOARD: `${BASE}/collectors/me/dashboard`,
    CLIENTS: `${BASE}/collectors/me/clients`,
    CLIENT: (id: string) => `${BASE}/collectors/me/clients/${id}`,
  },
  CLIENTS: {
    ME: `${BASE}/clients/me`,
    BALANCE: `${BASE}/clients/me/balance`,
    GROUP: `${BASE}/clients/me/group`,
    MEMBER_HISTORY: (id: string) => `${BASE}/clients/me/group/${id}/history`,
  },
  TRANSACTIONS: {
    SUBMIT_SMS: `${BASE}/transactions/submit/sms`,
    SUBMIT_SCREENSHOT: `${BASE}/transactions/submit/screenshot`,
    CLIENT_SUBMIT_SMS: `${BASE}/transactions/client/submit/sms`,
    CLIENT_SUBMIT_SCREENSHOT: `${BASE}/transactions/client/submit/screenshot`,
    FEED: `${BASE}/transactions/feed`,
    LIST: `${BASE}/transactions`,
    CONFIRM: (id: string) => `${BASE}/transactions/${id}/confirm`,
    QUERY: (id: string) => `${BASE}/transactions/${id}/query`,
    REJECT: (id: string) => `${BASE}/transactions/${id}/reject`,
    MY_HISTORY: `${BASE}/transactions/my-history`,
  },
  PAYOUTS: {
    REQUEST: `${BASE}/payouts/request`,
    MY_PAYOUTS: `${BASE}/payouts/my-payouts`,
    LIST: `${BASE}/payouts`,
    APPROVE: (id: string) => `${BASE}/payouts/${id}/approve`,
    DECLINE: (id: string) => `${BASE}/payouts/${id}/decline`,
    COMPLETE: (id: string) => `${BASE}/payouts/${id}/complete`,
  },
  REPORTS: {
    MONTHLY_SUMMARY: `${BASE}/reports/monthly-summary`,
    MONTHLY_PDF: `${BASE}/reports/monthly-summary/pdf`,
    CLIENT_STATEMENT: (id: string) => `${BASE}/reports/client-statement/${id}`,
  },
  USSD: {
    CALLBACK: `${BASE}/ussd/callback`,
  },
  HEALTH: `${BASE}/health`,
} as const;
