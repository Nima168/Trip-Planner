import { client } from './client'

export const createShareLink = (tripId) => client.post(`/trips/${tripId}/share`)
export const getSharedTrip = (token) => client.get(`/share/${token}`)
