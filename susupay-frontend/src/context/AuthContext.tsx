import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { setTokens, clearTokens, decodeAccessToken } from '../lib/token';
import { queryClient } from '../lib/queryClient';

export type UserRole = 'COLLECTOR' | 'CLIENT';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  userId: string | null;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  role: null,
  userId: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const decoded = decodeAccessToken();
    if (decoded) {
      setRole(decoded.role);
      setUserId(decoded.sub);
    } else {
      // Clear stale expired tokens so Axios doesn't attach dead credentials
      clearTokens();
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string) => {
    setTokens(accessToken, refreshToken);
    const decoded = decodeAccessToken();
    if (decoded) {
      setRole(decoded.role);
      setUserId(decoded.sub);
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setRole(null);
    setUserId(null);
    queryClient.clear();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: role !== null,
        isLoading,
        role,
        userId,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
