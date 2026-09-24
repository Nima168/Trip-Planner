import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/AuthContext";
import { NewTripPage } from "./NewTripPage";

function mockAiResponse(status: number, headers: Record<string, string> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ detail: "AI provider is busy" }), { status, headers })),
  );
}

async function sendMessage(text: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/trips/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/trips/new" element={<NewTripPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Message"), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
  return user;
}

describe("NewTripPage when the AI is rate limited", () => {
  beforeEach(() => {
    localStorage.setItem("musafir.auth.token", "token");
    localStorage.setItem("musafir.auth.username", "alice");
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("asks the user to wait for the Retry-After time and blocks sending meanwhile", async () => {
    mockAiResponse(429, { "Retry-After": "30" });
    const user = await sendMessage("Solo trip to Goa");

    expect(await screen.findByText("Our assistant needs a short breather")).toBeInTheDocument();
    expect(screen.getByText(/30 seconds/)).toBeInTheDocument();
    expect(screen.getByText(/your chat and\s+trip details are saved/)).toBeInTheDocument();
    // The user's message stays in the chat.
    expect(screen.getByText("Solo trip to Goa")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Message"), "hello");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("offers manual entry when the wait is long (daily quota)", async () => {
    mockAiResponse(429, { "Retry-After": "7200" });
    await sendMessage("Solo trip to Goa");

    expect(
      await screen.findByText("The AI assistant has reached its usage limit for now"),
    ).toBeInTheDocument();
    expect(screen.getByText(/about 2 hours/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enter details manually/ })).toBeInTheDocument();
  });
});
