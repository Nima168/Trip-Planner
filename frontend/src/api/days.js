import { client } from "./client";

export const createDay = (tripId, data) => client.post(`/trips/${tripId}/days`, data);
export const updateDay = (tripId, dayId, data) =>
  client.patch(`/trips/${tripId}/days/${dayId}`, data);
export const deleteDay = (tripId, dayId) => client.delete(`/trips/${tripId}/days/${dayId}`);
