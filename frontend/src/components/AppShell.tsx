import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { Icon } from "./Icon";

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${
          light ? "bg-white/15 text-white ring-1 ring-white/30" : "bg-primary text-white"
        }`}
      >
        <Icon name="compass" className="h-5 w-5" />
      </span>
      <span
        className={`font-display text-xl font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}
      >
        Musafir<span className={light ? "text-gold" : "text-primary"}>.</span>
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/trips" aria-label="Musafir Travels home">
            <BrandMark />
          </Link>

          {username && (
            <nav className="flex items-center gap-2 sm:gap-3">
              <NavLink
                to="/trips"
                end
                className={({ isActive }) =>
                  `hidden rounded-lg px-3 py-2 text-sm font-medium transition sm:block ${
                    isActive ? "text-primary" : "text-text-muted hover:text-ink"
                  }`
                }
              >
                My trips
              </NavLink>
              <Link to="/trips/new" className="btn-primary px-3 sm:px-4">
                <Icon name="plus" />
                <span className="hidden sm:inline">Plan a trip</span>
              </Link>
              <div className="ml-1 flex items-center gap-2 border-l border-border pl-3">
                <span
                  className="grid h-9 w-9 place-items-center rounded-full bg-gold-soft font-semibold uppercase text-primary"
                  title={`Logged in as ${username}`}
                >
                  {username.charAt(0)}
                </span>
                <span className="hidden text-sm text-text-muted md:block">
                  Logged in as <span className="font-medium text-ink">{username}</span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-ghost px-2.5"
                  aria-label="Log out"
                  title="Log out"
                >
                  <Icon name="logOut" />
                  <span className="hidden lg:inline">Log out</span>
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="border-t border-border/70 py-5 text-center text-xs text-text-muted">
        Musafir Travels · Plan every journey, one day at a time.
      </footer>
    </div>
  );
}

/** Photo banner used at the top of inner pages. */
export function PageBanner({
  image,
  children,
  className = "",
}: {
  image: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-ink bg-cover bg-center text-white shadow-lift ${className}`}
      style={{ backgroundImage: `url(${image})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/10" />
      <div className="relative">{children}</div>
    </section>
  );
}
