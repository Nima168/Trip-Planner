import { Link, useParams } from "react-router-dom";

import { useCreateActivity, useDeleteActivity, useTrip, useUpdateActivity } from "../api/queries";
import { AppShell } from "../components/AppShell";
import { DayPlanner } from "../components/DayPlanner";
import { DeleteTripButton } from "../components/DeleteTripButton";
import { PrintButton } from "../components/PrintButton";
import { TRIP_TYPE_LABELS } from "../types";
import { formatDateRange } from "../utils/date";

export function TripItineraryPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: trip, isLoading, isError } = useTrip(tripId);
  const createActivity = useCreateActivity(tripId ?? "");
  const updateActivity = useUpdateActivity(tripId ?? "");
  const deleteActivity = useDeleteActivity(tripId ?? "");

  const isMutating =
    createActivity.isPending || updateActivity.isPending || deleteActivity.isPending;

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-text-muted">Loading trip…</p>
      </AppShell>
    );
  }

  if (isError || !trip) {
    return (
      <AppShell>
        <p className="mb-3 text-error">Trip not found.</p>
        <Link to="/trips" className="text-primary hover:underline">
          ← Back to Trips
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link to="/trips" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to Trips
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{trip.destination}</h1>
          <p className="text-text-muted">
            {formatDateRange(trip.start_date, trip.end_date)} · {TRIP_TYPE_LABELS[trip.trip_type]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton trip={trip} />
          <DeleteTripButton tripId={trip.id} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {trip.days.map((day) => (
          <DayPlanner
            key={day.id}
            day={day}
            isMutating={isMutating}
            onAddActivity={(text) => createActivity.mutate({ dayId: day.id, payload: { text } })}
            onUpdateActivity={(activityId, text) =>
              updateActivity.mutate({ activityId, payload: { text } })
            }
            onDeleteActivity={(activityId) => deleteActivity.mutate(activityId)}
          />
        ))}
      </div>
    </AppShell>
  );
}
