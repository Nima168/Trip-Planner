import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/AuthContext";
import type { Trip } from "../types";
import { TripItineraryPage } from "./TripItineraryPage";

const emptyTrip: Trip = {
  id: "trip-1",
  destination: "Goa",
  start_date: "2026-10-01",
  end_date: "2026-10-02",
  trip_type: "solo",
  created_at: "2026-09-24T00:00:00Z",
  days: [
    { id: "day-1", day_number: 1, date: "2026-10-01", activities: [] },
    { id: "day-2", day_number: 2, date: "2026-10-02", activities: [] },
  ],
};

describe("TripItineraryPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(emptyTrip), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Save as PDF and Delete even when the trip has no activities", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/trips/trip-1"]}>
          <AuthProvider>
            <Routes>
              <Route path="/trips/:tripId" element={<TripItineraryPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("button", { name: "Save as PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});
