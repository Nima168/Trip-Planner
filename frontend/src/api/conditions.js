import { client } from './client'

export const getConditions = (tripId, dayId) =>
  client.get(`/trips/${tripId}/days/${dayId}/conditions`)

export const getSharedConditions = (token, dayId) =>
  client.get(`/share/${token}/days/${dayId}/conditions`)
