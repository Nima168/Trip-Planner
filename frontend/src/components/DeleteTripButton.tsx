import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDeleteTrip } from "../api/queries";

export function DeleteTripButton({ tripId }: { tripId: string }) {
  const [confirming, setConfirming] = useState(false);
  const deleteTrip = useDeleteTrip();
  const navigate = useNavigate();

  async function handleConfirm() {
    await deleteTrip.mutateAsync(tripId);
    navigate("/trips", { replace: true });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">Delete this trip?</span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={deleteTrip.isPending}
          className="rounded bg-error px-3 py-1 text-white hover:opacity-90 disabled:opacity-60"
        >
          {deleteTrip.isPending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded border border-border px-3 py-1 text-text hover:border-primary"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded border border-error px-3 py-1 text-sm text-error hover:bg-error hover:text-white"
    >
      Delete
    </button>
  );
}
