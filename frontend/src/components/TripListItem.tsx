import { Link } from "react-router-dom";

import type { TripSummary } from "../types";
import { TRIP_TYPE_LABELS } from "../types";
import { formatDateRange } from "../utils/date";
import { TRIP_TYPE_EMOJI, tripLengthDays, tripTiming, tripTimingLabel } from "../utils/trip";
import { Icon } from "./Icon";

const TIMING_STYLES = {
  upcoming: "bg-gold-soft text-primary",
  ongoing: "bg-success-soft text-success",
  past: "bg-sand text-text-muted",
} as const;

export function TripListItem({ trip }: { trip: TripSummary }) {
  const timing = tripTiming(trip.start_date, trip.end_date);
  const days = tripLengthDays(trip.start_date, trip.end_date);

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-gradient-to-br from-gold-soft via-surface to-primary-soft px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
            <Icon name="mapPin" className="h-3.5 w-3.5" /> Destination
          </p>
          <h3 className="mt-1 truncate font-display text-2xl font-semibold group-hover:text-primary">
            {trip.destination}
          </h3>
        </div>
        <span className="text-2xl" aria-hidden="true">
          {TRIP_TYPE_EMOJI[trip.trip_type]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <p className="flex items-center gap-2 text-sm text-text">
          <Icon name="calendar" className="h-4 w-4 text-text-muted" />
          {formatDateRange(trip.start_date, trip.end_date)}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <span className={`chip ${TIMING_STYLES[timing]}`}>
            <Icon name="clock" className="h-3.5 w-3.5" />
            {tripTimingLabel(trip.start_date, trip.end_date)}
          </span>
          <span className="chip bg-sand text-ink">
            {days} {days === 1 ? "day" : "days"}
          </span>
          <span className="chip bg-sand text-ink">{TRIP_TYPE_LABELS[trip.trip_type]}</span>
        </div>
      </div>
    </Link>
  );
}
