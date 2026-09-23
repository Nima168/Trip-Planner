import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { setAuthToken, setUnauthorizedHandler } from "../api/client";
import { clearStoredDraft } from "../hooks/useDraftPersistence";

const STORAGE_TOKEN_KEY = "musafir.auth.token";
const STORAGE_USERNAME_KEY = "musafir.auth.username";

interface AuthContextValue {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredValue(STORAGE_TOKEN_KEY));
  const [username, setUsername] = useState<string | null>(() =>
    readStoredValue(STORAGE_USERNAME_KEY),
  );
  const usernameRef = useRef(username);
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  const logout = useCallback(() => {
    if (usernameRef.current) {
      clearStoredDraft(usernameRef.current);
    }
    setToken(null);
    setUsername(null);
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USERNAME_KEY);
    } catch {
      // localStorage unavailable (private mode, blocked site data) — in-memory
      // state above is still cleared, which is what actually gates ProtectedRoute.
    }
  }, []);

  const login = useCallback((newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, newToken);
      localStorage.setItem(STORAGE_USERNAME_KEY, newUsername);
    } catch {
      // Session still works for this tab; it just won't survive a refresh.
    }
  }, []);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, username, isAuthenticated: Boolean(token), login, logout }),
    [token, username, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
