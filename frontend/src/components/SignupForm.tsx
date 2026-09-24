import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useSignup } from "../api/queries";
import { useAuth } from "../auth/AuthContext";
import { FormError, PasswordInput } from "./AuthLayout";

export function SignupForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const signup = useSignup();
  const auth = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await signup.mutateAsync({ username, password });
      auth.login(result.access_token, result.username);
      navigate("/trips", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Couldn't reach the server. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="signup-username" className="field-label">
          Username
        </label>
        <input
          id="signup-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
          className="field-input"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="field-label">
          Password
        </label>
        <PasswordInput
          id="signup-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
      </div>
      <FormError message={error} />
      <button type="submit" disabled={signup.isPending} className="btn-primary w-full py-3 text-base">
        {signup.isPending ? "Creating your account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
