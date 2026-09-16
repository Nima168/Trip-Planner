import { client } from "./client";

export const listTrips = () => client.get("/trips");
export const createTrip = (name) => client.post("/trips", { name });
export const getTrip = (tripId) => client.get(`/trips/${tripId}`);
export const deleteTrip = (tripId) => client.delete(`/trips/${tripId}`);
