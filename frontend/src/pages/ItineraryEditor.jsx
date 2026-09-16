import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTrip } from '../api/trips'
import DayCard from '../components/DayCard'
import DayForm from '../components/DayForm'
import './pages.css'

export default function ItineraryEditor() {
  const { tripId } = useParams()
  const [state, setState] = useState({ status: 'loading' })
  const [addingDay, setAddingDay] = useState(false)

  function fetchTrip() {
    getTrip(tripId)
      .then((trip) => setState({ status: 'ready', trip }))
      .catch((err) => {
        if (err.status === 404) {
          setState({ status: 'not-found' })
        } else {
          setState({ status: 'error', error: err.message })
        }
      })
  }

  function retry() {
    setState({ status: 'loading' })
    fetchTrip()
  }

  useEffect(fetchTrip, [tripId])

  function handleDayCreated(day) {
    setState((s) => ({ ...s, trip: { ...s.trip, days: [...s.trip.days, day] } }))
    setAddingDay(false)
  }

  function handleDayUpdated(updatedDay) {
    setState((s) => ({
      ...s,
      trip: {
        ...s.trip,
        days: s.trip.days.map((d) => (d.id === updatedDay.id ? updatedDay : d)),
      },
    }))
  }

  function handleDayDeleted(dayId) {
    setState((s) => ({
      ...s,
      trip: { ...s.trip, days: s.trip.days.filter((d) => d.id !== dayId) },
    }))
  }

  if (state.status === 'loading') {
    return <div className="loading-state">Loading trip…</div>
  }

  if (state.status === 'not-found') {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Trip not found.</p>
          <Link className="btn" to="/">
            Back to Trips
          </Link>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="error-banner">
        Couldn't load this trip: {state.error}{' '}
        <button className="btn-link" onClick={retry}>
          Retry
        </button>
      </div>
    )
  }

  const { trip } = state

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{trip.name}</h1>
          <Link className="btn-link" to="/">
            Back to Trips
          </Link>
        </div>
      </div>

      {trip.days.length === 0 && (
        <div className="empty-state">
          <p>No days yet — add your first day.</p>
          <DayForm tripId={tripId} onSaved={handleDayCreated} />
        </div>
      )}

      {trip.days.length > 0 && (
        <>
          {trip.days.map((day) => (
            <DayCard
              key={day.id}
              tripId={tripId}
              day={day}
              onUpdated={handleDayUpdated}
              onDeleted={handleDayDeleted}
            />
          ))}

          {addingDay ? (
            <DayForm
              tripId={tripId}
              onSaved={handleDayCreated}
              onCancel={() => setAddingDay(false)}
            />
          ) : (
            <button className="btn" onClick={() => setAddingDay(true)}>
              + Add Day
            </button>
          )}
        </>
      )}
    </div>
  )
}
