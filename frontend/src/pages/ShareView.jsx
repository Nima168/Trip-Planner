import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSharedTrip } from '../api/share'
import DayCard from '../components/DayCard'
import './pages.css'

export default function ShareView() {
  const { token } = useParams()
  const [state, setState] = useState({ status: 'loading' })

  function fetchTrip() {
    getSharedTrip(token)
      .then((trip) => setState({ status: 'ready', trip }))
      .catch((err) => {
        if (err.status === 404) {
          setState({ status: 'invalid' })
        } else {
          setState({ status: 'error', error: err.message })
        }
      })
  }

  function retry() {
    setState({ status: 'loading' })
    fetchTrip()
  }

  useEffect(fetchTrip, [token])

  if (state.status === 'loading') {
    return <div className="loading-state">Loading itinerary…</div>
  }

  if (state.status === 'invalid') {
    return (
      <div className="page">
        <div className="empty-state">
          <p>This link is invalid or no longer available.</p>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="error-banner">
        Couldn't load this itinerary: {state.error}{' '}
        <button className="btn-link" onClick={retry}>
          Retry
        </button>
      </div>
    )
  }

  const { trip } = state

  return (
    <div className="page page-share-view">
      <div className="page-header">
        <div className="hero-title">
          <h1>{trip.name}</h1>
        </div>
      </div>

      {trip.days.length === 0 ? (
        <div className="empty-state">
          <p>This trip has no days yet.</p>
        </div>
      ) : (
        trip.days.map((day) => (
          <DayCard key={day.id} shareToken={token} day={day} readOnly />
        ))
      )}
    </div>
  )
}
