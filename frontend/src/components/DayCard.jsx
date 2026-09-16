import { useState } from 'react'
import { deleteActivity } from '../api/activities'
import { deleteDay } from '../api/days'
import ActivityForm from './ActivityForm'

function ActivityRow({ tripId, dayId, activity, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleDelete() {
    if (!window.confirm(`Delete activity "${activity.title}"?`)) return
    setDeleting(true)
    setError(null)
    try {
      await deleteActivity(tripId, dayId, activity.id)
      onDeleted(activity.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <ActivityForm
        tripId={tripId}
        dayId={dayId}
        activity={activity}
        onSaved={(updated) => {
          onUpdated(updated)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <li className="activity-row">
      <div>
        <strong>
          {activity.start_time}–{activity.end_time} {activity.title}
        </strong>
        {activity.location && <div className="trip-card-meta">{activity.location}</div>}
        {error && <div className="field-error">{error}</div>}
      </div>
      <div className="activity-actions">
        <button className="btn" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </li>
  )
}

export default function DayCard({ tripId, day, onUpdated, onDeleted }) {
  const [addingActivity, setAddingActivity] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  function updateActivities(activities) {
    onUpdated({ ...day, activities })
  }

  async function handleDeleteDay() {
    if (!window.confirm(`Delete this day (${day.date})? Its activities will be removed too.`))
      return
    setDeleting(true)
    setError(null)
    try {
      await deleteDay(tripId, day.id)
      onDeleted(day.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="day-card">
      <div className="day-card-header">
        <div>
          <strong>{day.date}</strong>
          {(day.start_time || day.end_time) && (
            <span className="trip-card-meta">
              {' '}
              {day.start_time ?? '?'}–{day.end_time ?? '?'}
            </span>
          )}
          {day.notes && <div className="trip-card-meta">{day.notes}</div>}
        </div>
        <button className="btn btn-danger" onClick={handleDeleteDay} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete Day'}
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {day.activities.length === 0 ? (
        <div className="empty-state">
          <p>No activities yet — add one.</p>
        </div>
      ) : (
        <ul className="trip-list">
          {day.activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              tripId={tripId}
              dayId={day.id}
              activity={activity}
              onUpdated={(updated) =>
                updateActivities(
                  day.activities.map((a) => (a.id === updated.id ? updated : a))
                )
              }
              onDeleted={(activityId) =>
                updateActivities(day.activities.filter((a) => a.id !== activityId))
              }
            />
          ))}
        </ul>
      )}

      {addingActivity ? (
        <ActivityForm
          tripId={tripId}
          dayId={day.id}
          onSaved={(created) => {
            updateActivities([...day.activities, created])
            setAddingActivity(false)
          }}
          onCancel={() => setAddingActivity(false)}
        />
      ) : (
        <button className="btn" onClick={() => setAddingActivity(true)}>
          + Add Activity
        </button>
      )}
    </div>
  )
}
