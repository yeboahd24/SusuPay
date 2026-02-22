import { jwtDecode } from 'jwt-decode';

const ACCESS_TOKEN_KEY = 'susupay_access_token';
const REFRESH_TOKEN_KEY = 'susupay_refresh_token';

interface TokenPayload {
  sub: string;
  role: 'COLLECTOR' | 'CLIENT';
  exp: number;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function decodeAccessToken(): TokenPayload | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    if (decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
