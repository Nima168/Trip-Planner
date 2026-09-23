import { useMutation } from "@tanstack/react-query";

import { apiRequest } from "./client";
import type { TripDraftRequest, TripDraftResponse } from "../types/ai";

export function getTripDraft(
  payload: TripDraftRequest,
  signal?: AbortSignal,
): Promise<TripDraftResponse> {
  return apiRequest<TripDraftResponse>("/ai/trip-draft", { method: "POST", body: payload, signal });
}

export function useTripDraft() {
  return useMutation({
    mutationFn: ({ payload, signal }: { payload: TripDraftRequest; signal?: AbortSignal }) =>
      getTripDraft(payload, signal),
  });
}
