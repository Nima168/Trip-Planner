import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useLogin } from "../api/queries";
import { useAuth } from "../auth/AuthContext";
import { FormError, PasswordInput } from "./AuthLayout";

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
      if (err instanceof ApiError && err.status === 401) {
        setError("That username and password don't match. Please try again.");
      } else {
        setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Couldn't reach the server. Please try again.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="login-username" className="field-label">
          Username
        </label>
        <input
          id="login-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
          className="field-input"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="field-label">
          Password
        </label>
        <PasswordInput
          id="login-password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
      </div>
      <FormError message={error} />
      <button type="submit" disabled={login.isPending} className="btn-primary w-full py-3 text-base">
        {login.isPending ? "Logging in…" : "Log in"}
      </button>
      <p className="text-center text-sm text-text-muted">
        New to Musafir?{" "}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
