import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/trips" className="text-lg font-semibold text-primary hover:text-primary-hover">
            Musafir Travels
          </Link>
          {username && (
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span>
                Logged in as <span className="font-medium text-text">{username}</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded border border-border px-3 py-1 text-text hover:border-primary hover:text-primary"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
