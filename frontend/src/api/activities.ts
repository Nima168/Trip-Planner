import { apiRequest } from "./client";
import type { Activity, CreateActivityRequest, UpdateActivityRequest } from "../types";

export function createActivity(
  tripId: string,
  dayId: string,
  payload: CreateActivityRequest,
): Promise<Activity> {
  return apiRequest<Activity>(`/trips/${tripId}/days/${dayId}/activities`, {
    method: "POST",
    body: payload,
  });
}

export function updateActivity(
  activityId: string,
  payload: UpdateActivityRequest,
): Promise<Activity> {
  return apiRequest<Activity>(`/activities/${activityId}`, { method: "PATCH", body: payload });
}

export function deleteActivity(activityId: string): Promise<void> {
  return apiRequest<void>(`/activities/${activityId}`, { method: "DELETE" });
}
