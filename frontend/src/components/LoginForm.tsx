import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useLogin } from "../api/queries";
import { useAuth } from "../auth/AuthContext";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();
  const auth = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await login.mutateAsync({ username, password });
      auth.login(result.access_token, result.username);
      navigate("/trips", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Login failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-16 max-w-sm rounded-lg border border-border bg-surface p-6">
      <h1 className="mb-4 text-xl font-semibold">Log in</h1>
      <div className="mb-3">
        <label htmlFor="login-username" className="mb-1 block text-sm text-text-muted">
          Username
        </label>
        <input
          id="login-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full rounded border border-border bg-surface px-3 py-2 text-text focus:border-primary focus:outline-none"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="login-password" className="mb-1 block text-sm text-text-muted">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded border border-border bg-surface px-3 py-2 text-text focus:border-primary focus:outline-none"
        />
      </div>
      {error && <p className="mb-3 text-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={login.isPending}
        className="w-full rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {login.isPending ? "Logging in…" : "Log in"}
      </button>
      <p className="mt-4 text-center text-sm text-text-muted">
        No account?{" "}
        <Link to="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
