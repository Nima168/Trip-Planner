import { Link } from "react-router-dom";

import { useTrips } from "../api/queries";
import { AppShell } from "../components/AppShell";
import { TripListItem } from "../components/TripListItem";

export function HomePage() {
  const { data: trips, isLoading, isError, refetch } = useTrips();

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Welcome to Musafir Travels</h1>
        <Link
          to="/trips/new"
          className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
        >
          Add New Trip
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Trip Plan</h2>

      {isLoading && <p className="text-text-muted">Loading your trips…</p>}

      {isError && (
        <div className="rounded border border-error/40 bg-error/10 p-4">
          <p className="mb-2 text-error">Couldn't load your trips.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded border border-error px-3 py-1 text-sm text-error hover:bg-error hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {trips && trips.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="mb-4 text-text-muted">No trips yet.</p>
          <Link
            to="/trips/new"
            className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
          >
            Add New Trip
          </Link>
        </div>
      )}

      {trips && trips.length > 0 && (
        <div className="flex flex-col gap-3">
          {trips.map((trip) => (
            <TripListItem key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
