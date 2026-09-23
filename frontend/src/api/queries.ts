import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as activitiesApi from "./activities";
import * as authApi from "./auth";
import * as tripsApi from "./trips";
import type {
  CreateActivityRequest,
  CreateTripRequest,
  LoginRequest,
  SignupRequest,
  UpdateActivityRequest,
} from "../types";

export const tripsKey = ["trips"] as const;
export const tripKey = (tripId: string) => ["trips", tripId] as const;

export function useTrips() {
  return useQuery({ queryKey: tripsKey, queryFn: tripsApi.listTrips });
}

export function useTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: tripKey(tripId ?? ""),
    queryFn: () => tripsApi.getTrip(tripId!),
    enabled: Boolean(tripId),
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTripRequest) => tripsApi.createTrip(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripsKey, exact: true });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.deleteTrip(tripId),
    onSuccess: (_data, tripId) => {
      // Evict the now-404ing single-trip query instead of invalidating it (which
      // would refetch and briefly flash a not-found error before navigation away).
      queryClient.removeQueries({ queryKey: tripKey(tripId) });
      queryClient.invalidateQueries({ queryKey: tripsKey, exact: true });
    },
  });
}

export function useCreateActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, payload }: { dayId: string; payload: CreateActivityRequest }) =>
      activitiesApi.createActivity(tripId, dayId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKey(tripId) });
    },
  });
}

export function useUpdateActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      activityId,
      payload,
    }: {
      activityId: string;
      payload: UpdateActivityRequest;
    }) => activitiesApi.updateActivity(activityId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKey(tripId) });
    },
  });
}

export function useDeleteActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (activityId: string) => activitiesApi.deleteActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKey(tripId) });
    },
  });
}

export function useLogin() {
  return useMutation({ mutationFn: (payload: LoginRequest) => authApi.login(payload) });
}

export function useSignup() {
  return useMutation({ mutationFn: (payload: SignupRequest) => authApi.signup(payload) });
}
