export type TripType = "solo" | "couple" | "family" | "group_of_friends";

export interface Activity {
  id: string;
  day_id: string;
  text: string;
  sort_order: number;
  created_at: string;
}

export interface Day {
  id: string;
  day_number: number;
  date: string;
  activities: Activity[];
}

export interface TripSummary {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  trip_type: TripType;
  created_at: string;
}

export interface Trip extends TripSummary {
  days: Day[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  username: string;
}

export interface CreateTripRequest {
  destination: string;
  start_date: string;
  end_date: string;
  trip_type: TripType;
}

export interface CreateActivityRequest {
  text: string;
}

export interface UpdateActivityRequest {
  text: string;
}

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  solo: "Solo",
  couple: "Couple",
  family: "Family",
  group_of_friends: "Group of friends",
};
