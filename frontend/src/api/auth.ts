import { apiRequest } from "./client";
import type { AuthResponse, LoginRequest, SignupRequest } from "../types";

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", { method: "POST", body: payload });
}

export function signup(payload: SignupRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/signup", { method: "POST", body: payload });
}
