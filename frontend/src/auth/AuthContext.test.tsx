import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "../pages/HomePage";
import { AuthProvider } from "./AuthContext";

describe("AuthProvider after a page refresh", () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));

  beforeEach(() => {
    localStorage.setItem("musafir.auth.token", "stored-token");
    localStorage.setItem("musafir.auth.username", "alice");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    localStorage.clear();
    fetchMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("sends the stored token on the very first request", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <HomePage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer stored-token");
    await waitFor(() => expect(screen.getByText(/No trips yet/i)).toBeInTheDocument());
    expect(localStorage.getItem("musafir.auth.token")).toBe("stored-token");
  });
});
