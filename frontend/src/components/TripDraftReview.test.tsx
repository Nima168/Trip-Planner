import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TripDraft } from "../types/ai";
import { localTodayIso } from "../utils/date";
import { TripDraftReview } from "./TripDraftReview";

function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localTodayIso(date);
}

function renderReview(draft: TripDraft, isComplete = false) {
  render(
    <TripDraftReview
      draft={draft}
      missingFields={[]}
      clarificationFields={[]}
      onChange={vi.fn()}
      onSubmit={vi.fn()}
      isComplete={isComplete}
      isSubmitting={false}
    />,
  );
}

describe("TripDraftReview past-date validation", () => {
  afterEach(cleanup);

  it("shows errors for a start and end date in the past", () => {
    renderReview({
      destination: "Goa",
      start_date: isoDaysFromToday(-10),
      end_date: isoDaysFromToday(-8),
      trip_type: "solo",
    });

    expect(screen.getByText("Start date can't be in the past — choose today or a later date.")).toBeInTheDocument();
    expect(screen.getByText("End date can't be in the past — choose today or a later date.")).toBeInTheDocument();
    expect(screen.getByLabelText(/From/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("2 of 4 ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create trip/ })).toBeDisabled();
  });

  it("flags only the start date when the trip started earlier but ends in the future", () => {
    renderReview({
      destination: "Goa",
      start_date: isoDaysFromToday(-2),
      end_date: isoDaysFromToday(3),
      trip_type: "solo",
    });

    expect(screen.getByText(/Start date can't be in the past/)).toBeInTheDocument();
    expect(screen.queryByText(/End date can't be in the past/)).not.toBeInTheDocument();
  });

  it("accepts a trip starting today, and past dates can't be picked", () => {
    const today = localTodayIso();
    renderReview(
      { destination: "Goa", start_date: today, end_date: isoDaysFromToday(2), trip_type: "solo" },
      true,
    );

    expect(screen.queryByText(/can't be in the past/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/From/)).toHaveAttribute("min", today);
    expect(screen.getByRole("button", { name: /Create trip/ })).toBeEnabled();
  });
});
