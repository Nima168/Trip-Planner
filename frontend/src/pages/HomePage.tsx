import { Link } from "react-router-dom";

import { useTrips } from "../api/queries";
import { useAuth } from "../auth/AuthContext";
import { AppShell, PageBanner } from "../components/AppShell";
import { Icon } from "../components/Icon";
import { TripListItem } from "../components/TripListItem";
import type { TripSummary } from "../types";
import { tripTiming } from "../utils/trip";

// Upcoming and ongoing trips first (soonest first), then past trips (most recent first).
function sortTrips(trips: TripSummary[]): TripSummary[] {
  const active = trips.filter((t) => tripTiming(t.start_date, t.end_date) !== "past");
  const past = trips.filter((t) => tripTiming(t.start_date, t.end_date) === "past");
  active.sort((a, b) => a.start_date.localeCompare(b.start_date));
  past.sort((a, b) => b.start_date.localeCompare(a.start_date));
  return [...active, ...past];
}

function TripCardSkeleton() {
  return (
    <div className="card h-44 animate-pulse overflow-hidden">
      <div className="h-20 bg-sand" />
      <div className="space-y-2 p-5">
        <div className="h-3 w-1/2 rounded bg-sand" />
        <div className="h-3 w-1/3 rounded bg-sand" />
      </div>
    </div>
  );
}

export function HomePage() {
  const { username } = useAuth();
  const { data: trips, isLoading, isError, refetch } = useTrips();
  const upcomingCount = trips?.filter((t) => tripTiming(t.start_date, t.end_date) !== "past").length ?? 0;

  return (
    <AppShell>
      <PageBanner image="/images/hero-road.jpg" className="mb-8">
        <div className="px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-sm font-medium uppercase tracking-widest text-gold">Welcome to Musafir Travels</p>
          <h1 className="mt-2 max-w-xl font-display text-3xl font-semibold leading-tight text-white sm:text-5xl">
            {username ? `Hi ${username}, where to next?` : "Where to next?"}
          </h1>
          <p className="mt-3 max-w-lg text-white/85">
            Tell our assistant about your trip in plain words — we'll turn it into a day-by-day plan.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/trips/new" className="btn-primary px-5 py-3 text-base">
              <Icon name="sparkles" />
              Plan a new trip
            </Link>
            {trips && trips.length > 0 && (
              <span className="chip bg-white/15 px-4 py-2 text-sm text-white ring-1 ring-white/25">
                {upcomingCount} upcoming · {trips.length} total
              </span>
            )}
          </div>
        </div>
      </PageBanner>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Your trips</h2>
          <p className="text-sm text-text-muted">Upcoming trips first — tap a trip to plan its days.</p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading your trips">
          <TripCardSkeleton />
          <TripCardSkeleton />
          <TripCardSkeleton />
        </div>
      )}

      {isError && (
        <div role="alert" className="card flex flex-wrap items-center justify-between gap-3 border-error/30 bg-error-soft p-5">
          <p className="flex items-center gap-2 text-error">
            <Icon name="alert" /> Couldn't load your trips. Check your connection and try again.
          </p>
          <button type="button" onClick={() => refetch()} className="btn-danger">
            <Icon name="refresh" /> Retry
          </button>
        </div>
      )}

      {trips && trips.length === 0 && (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gold-soft text-primary">
            <Icon name="compass" className="h-8 w-8" />
          </span>
          <h3 className="mt-4 font-display text-xl font-semibold">No trips yet</h3>
          <p className="mt-2 max-w-sm text-text-muted">
            Try something like “Solo trip to Goa from 1 to 3 October” and we'll set up your days.
          </p>
          <Link to="/trips/new" className="btn-primary mt-6 px-5 py-3">
            <Icon name="plus" /> Plan your first trip
          </Link>
        </div>
      )}

      {trips && trips.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortTrips(trips).map((trip) => (
            <TripListItem key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
