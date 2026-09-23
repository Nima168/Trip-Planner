import { apiRequest } from "./client";
import type { CreateTripRequest, Trip, TripSummary } from "../types";

export function listTrips(): Promise<TripSummary[]> {
  return apiRequest<TripSummary[]>("/trips");
}

export function getTrip(tripId: string): Promise<Trip> {
  return apiRequest<Trip>(`/trips/${tripId}`);
}

export function createTrip(payload: CreateTripRequest): Promise<Trip> {
  return apiRequest<Trip>("/trips", { method: "POST", body: payload });
}

export function deleteTrip(tripId: string): Promise<void> {
  return apiRequest<void>(`/trips/${tripId}`, { method: "DELETE" });
}
