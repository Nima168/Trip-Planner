import { Link } from "react-router-dom";

import type { TripSummary } from "../types";
import { TRIP_TYPE_LABELS } from "../types";
import { formatDateRange } from "../utils/date";

export function TripListItem({ trip }: { trip: TripSummary }) {
  return (
    <Link
      to={`/trips/${trip.id}`}
      className="block rounded-lg border border-border bg-surface p-4 transition hover:border-primary"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-text">{trip.destination}</h3>
          <p className="text-sm text-text-muted">{formatDateRange(trip.start_date, trip.end_date)}</p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-background px-3 py-1 text-xs font-medium text-primary">
          {TRIP_TYPE_LABELS[trip.trip_type]}
        </span>
      </div>
    </Link>
  );
}
