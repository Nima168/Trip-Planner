import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createShareLink } from '../api/share'
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
      <button type="submit" className="btn btn-primary" disabled={creating}>
        {creating ? 'Creating…' : 'New Trip'}
      </button>
      <div className="field">
        <label htmlFor="trip-name" className="sr-only">
          Trip name
        </label>
        <input
          id="trip-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name your trip, e.g. Japan 2026"
          disabled={creating}
        />
        {error && <span className="field-error">{error}</span>}
      </div>
    </form>
  )
}

function TripRow({ trip, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [shareFeedback, setShareFeedback] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!confirmingDelete) return
    const timer = setTimeout(() => setConfirmingDelete(false), 4000)
    return () => clearTimeout(timer)
  }, [confirmingDelete])

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteTrip(trip.id)
      onDeleted(trip.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  async function handleShare() {
    setSharing(true)
    try {
      const { token } = await createShareLink(trip.id)
      const url = `${window.location.origin}/share/${token}`
      try {
        await navigator.clipboard.writeText(url)
        setShareFeedback('Copied to clipboard')
        setCopied(true)
      } catch {
        setShareFeedback('Link ready')
      }
    } catch (err) {
      setShareFeedback(err.message)
    } finally {
      setSharing(false)
      setTimeout(() => {
        setShareFeedback(null)
        setCopied(false)
      }, 1600)
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
      <div className="trip-card-actions">
        <button
          className={`btn btn-icon${copied ? ' btn-icon-success' : ''}`}
          onClick={handleShare}
          disabled={sharing}
          aria-label={`Share ${trip.name}`}
          title={shareFeedback ?? 'Share'}
        >
          {copied ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          )}
        </button>
        {confirmingDelete ? (
          <span className="confirm-inline">
            <span className="confirm-inline-label">Delete trip?</span>
            <button
              className="btn btn-danger btn-icon"
              onClick={handleDelete}
              disabled={deleting}
              aria-label={`Confirm delete ${trip.name}`}
              title={deleting ? 'Deleting…' : 'Confirm delete'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              className="btn btn-icon"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              aria-label="Cancel delete"
              title="Cancel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ) : (
          <button
            className="btn btn-danger btn-icon"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${trip.name}`}
            title="Delete"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
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
    <div className="page page-trip-list">
      <div className="page-header">
        <div className="hero-title">
          <h1>Trip Planner</h1>
          <p className="hero-tagline">Plan your trip, right now.</p>
        </div>
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
