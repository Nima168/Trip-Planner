import { client } from "./client";

export const createActivity = (tripId, dayId, data) =>
  client.post(`/trips/${tripId}/days/${dayId}/activities`, data);
export const updateActivity = (tripId, dayId, activityId, data) =>
  client.patch(`/trips/${tripId}/days/${dayId}/activities/${activityId}`, data);
export const deleteActivity = (tripId, dayId, activityId) =>
  client.delete(`/trips/${tripId}/days/${dayId}/activities/${activityId}`);
