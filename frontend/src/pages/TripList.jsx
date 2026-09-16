import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createTrip, deleteTrip, listTrips } from '../api/trips'
import './pages.css'

function NewTripForm({ onCreated }) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const trip = await createTrip(name)
      onCreated(trip)
      navigate(`/trips/${trip.id}`)
    } catch (err) {
      setError(err.fields?.name ?? err.message)
      setCreating(false)
    }
  }

  return (
    <form className="form-inline" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="trip-name">Trip name</label>
        <input
          id="trip-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Japan 2026"
          disabled={creating}
        />
        {error && <span className="field-error">{error}</span>}
      </div>
      <button type="submit" className="btn btn-primary" disabled={creating}>
        {creating ? 'Creating…' : 'New Trip'}
      </button>
    </form>
  )
}

function TripRow({ trip, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleDelete() {
    if (!window.confirm(`Delete "${trip.name}"? This cannot be undone.`)) return
    setDeleting(true)
    setError(null)
    try {
      await deleteTrip(trip.id)
      onDeleted(trip.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  const range =
    trip.start_date && trip.end_date
      ? trip.start_date === trip.end_date
        ? trip.start_date
        : `${trip.start_date} – ${trip.end_date}`
      : 'No days yet'

  return (
    <li className="trip-card">
      <Link className="trip-card-link" to={`/trips/${trip.id}`}>
        <h2>{trip.name}</h2>
        <div className="trip-card-meta">
          {range} · {trip.day_count} day{trip.day_count === 1 ? '' : 's'}
        </div>
        {error && <div className="field-error">{error}</div>}
      </Link>
      <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
        {deleting ? 'Deleting…' : 'Delete'}
      </button>
    </li>
  )
}

export default function TripList() {
  const [state, setState] = useState({ status: 'loading', trips: [] })

  function fetchTrips() {
    listTrips()
      .then((trips) => setState({ status: 'ready', trips }))
      .catch((err) => setState({ status: 'error', error: err.message, trips: [] }))
  }

  function retry() {
    setState({ status: 'loading', trips: [] })
    fetchTrips()
  }

  useEffect(fetchTrips, [])

  function handleCreated(trip) {
    setState((s) => ({ ...s, trips: [...s.trips, trip] }))
  }

  function handleDeleted(tripId) {
    setState((s) => ({ ...s, trips: s.trips.filter((t) => t.id !== tripId) }))
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Trips</h1>
      </div>

      <NewTripForm onCreated={handleCreated} />

      {state.status === 'loading' && <div className="loading-state">Loading trips…</div>}

      {state.status === 'error' && (
        <div className="error-banner">
          Couldn't load trips: {state.error}{' '}
          <button className="btn-link" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      {state.status === 'ready' && state.trips.length === 0 && (
        <div className="empty-state">
          <p>No trips yet.</p>
        </div>
      )}

      {state.status === 'ready' && state.trips.length > 0 && (
        <ul className="trip-list">
          {state.trips.map((trip) => (
            <TripRow key={trip.id} trip={trip} onDeleted={handleDeleted} />
          ))}
        </ul>
      )}
    </div>
  )
}
