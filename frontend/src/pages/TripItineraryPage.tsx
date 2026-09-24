import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useCreateActivity, useDeleteActivity, useTrip, useUpdateActivity } from "../api/queries";
import { AppShell, PageBanner } from "../components/AppShell";
import { DayPlanner } from "../components/DayPlanner";
import { DeleteTripButton } from "../components/DeleteTripButton";
import { Icon } from "../components/Icon";
import { PrintButton } from "../components/PrintButton";
import { TRIP_TYPE_LABELS } from "../types";
import { formatDateRange } from "../utils/date";
import { TRIP_TYPE_EMOJI, tripLengthDays, tripTimingLabel } from "../utils/trip";

export function TripItineraryPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: trip, isLoading, isError } = useTrip(tripId);
  const createActivity = useCreateActivity(tripId ?? "");
  const updateActivity = useUpdateActivity(tripId ?? "");
  const deleteActivity = useDeleteActivity(tripId ?? "");
  // null = default (first day open); otherwise the set the user has toggled open.
  const [openDays, setOpenDays] = useState<Set<string> | null>(null);

  const isMutating =
    createActivity.isPending || updateActivity.isPending || deleteActivity.isPending;

  if (isLoading) {
    return (
      <AppShell>
        <div className="h-56 animate-pulse rounded-3xl bg-sand" aria-label="Loading trip" />
        <div className="mt-6 space-y-3">
          <div className="h-16 animate-pulse rounded-2xl bg-sand" />
          <div className="h-16 animate-pulse rounded-2xl bg-sand" />
        </div>
      </AppShell>
    );
  }

  if (isError || !trip) {
    return (
      <AppShell>
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <Icon name="mapPin" className="h-10 w-10 text-text-muted" />
          <p className="mt-3 font-display text-xl font-semibold">Trip not found.</p>
          <p className="mt-1 text-text-muted">It may have been deleted, or the link is wrong.</p>
          <Link to="/trips" className="btn-primary mt-6">
            <Icon name="arrowLeft" /> Back to Trips
          </Link>
        </div>
      </AppShell>
    );
  }

  const days = tripLengthDays(trip.start_date, trip.end_date);
  const activityCount = trip.days.reduce((sum, day) => sum + day.activities.length, 0);
  const effectiveOpen = openDays ?? new Set(trip.days.slice(0, 1).map((d) => d.id));
  const allOpen = trip.days.every((d) => effectiveOpen.has(d.id));

  function toggleDay(dayId: string) {
    const next = new Set(effectiveOpen);
    if (next.has(dayId)) next.delete(dayId);
    else next.add(dayId);
    setOpenDays(next);
  }

  function toggleAll() {
    setOpenDays(allOpen ? new Set() : new Set(trip!.days.map((d) => d.id)));
  }

  return (
    <AppShell>
      <Link to="/trips" className="btn-ghost -ml-3 mb-3 px-3">
        <Icon name="arrowLeft" /> Back to Trips
      </Link>

      <PageBanner image="/images/hero-road.jpg" className="mb-8">
        <div className="flex flex-col gap-6 px-6 py-8 sm:px-10 sm:py-10 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-widest text-gold">
              <Icon name="mapPin" className="h-4 w-4" /> Your trip
            </p>
            <h1 className="mt-2 break-words font-display text-4xl font-semibold text-white sm:text-5xl">
              {trip.destination}
            </h1>
            <p className="mt-3 text-white/85">
              {formatDateRange(trip.start_date, trip.end_date)} · {TRIP_TYPE_LABELS[trip.trip_type]}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                `${TRIP_TYPE_EMOJI[trip.trip_type]} ${TRIP_TYPE_LABELS[trip.trip_type]}`,
                `${days} ${days === 1 ? "day" : "days"}`,
                `${activityCount} ${activityCount === 1 ? "activity" : "activities"}`,
                tripTimingLabel(trip.start_date, trip.end_date),
              ].map((label) => (
                <span key={label} className="chip bg-white/15 text-white ring-1 ring-white/25">
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start rounded-2xl bg-white/95 p-2 shadow-lift md:self-auto">
            <PrintButton trip={trip} />
            <DeleteTripButton tripId={trip.id} />
          </div>
        </div>
      </PageBanner>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Day-by-day plan</h2>
          <p className="text-sm text-text-muted">Open a day to add, edit or remove activities.</p>
        </div>
        {trip.days.length > 1 && (
          <button type="button" onClick={toggleAll} className="btn-secondary">
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-px before:bg-border">
        {trip.days.map((day) => (
          <DayPlanner
            key={day.id}
            day={day}
            expanded={effectiveOpen.has(day.id)}
            onToggle={() => toggleDay(day.id)}
            isMutating={isMutating}
            onAddActivity={(text) => createActivity.mutate({ dayId: day.id, payload: { text } })}
            onUpdateActivity={(activityId, text) =>
              updateActivity.mutate({ activityId, payload: { text } })
            }
            onDeleteActivity={(activityId) => deleteActivity.mutate(activityId)}
          />
        ))}
      </ol>
    </AppShell>
  );
}
