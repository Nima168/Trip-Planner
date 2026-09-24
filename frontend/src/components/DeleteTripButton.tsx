import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDeleteTrip } from "../api/queries";
import { Icon } from "./Icon";

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
      <div role="alertdialog" aria-label="Confirm delete" className="flex flex-wrap items-center gap-2 text-sm">
        <span className="px-1 font-medium text-ink">Delete this trip?</span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={deleteTrip.isPending}
          className="btn bg-error text-white hover:opacity-90"
        >
          {deleteTrip.isPending ? "Deleting…" : "Yes, delete"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="btn-secondary">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)} className="btn-danger">
      <Icon name="trash" />
      Delete
    </button>
  );
}
