import { useEffect, useState } from 'react'
import { deleteActivity } from '../api/activities'
import { deleteDay } from '../api/days'
import ActivityForm from './ActivityForm'
import ConditionsWidget from './ConditionsWidget'

function ActivityRow({ tripId, dayId, activity, onUpdated, onDeleted, readOnly }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!confirmingDelete) return
    const timer = setTimeout(() => setConfirmingDelete(false), 4000)
    return () => clearTimeout(timer)
  }, [confirmingDelete])

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteActivity(tripId, dayId, activity.id)
      onDeleted(activity.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
      setConfirmingDelete(false)
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
      {!readOnly && (
        <div className="activity-actions">
          {confirmingDelete ? (
            <span className="confirm-inline">
              <span className="confirm-inline-label">Delete?</span>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes'}
              </button>
              <button
                className="btn"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
            </span>
          ) : (
            <>
              <button className="btn" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </li>
  )
}

export default function DayCard({
  tripId,
  shareToken,
  day,
  onUpdated = () => {},
  onDeleted = () => {},
  readOnly = false,
}) {
  const [addingActivity, setAddingActivity] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!confirmingDelete) return
    const timer = setTimeout(() => setConfirmingDelete(false), 5000)
    return () => clearTimeout(timer)
  }, [confirmingDelete])

  function updateActivities(activities) {
    onUpdated({ ...day, activities })
  }

  async function handleDeleteDay() {
    setDeleting(true)
    setError(null)
    try {
      await deleteDay(tripId, day.id)
      onDeleted(day.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
      setConfirmingDelete(false)
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
          {day.location && <div className="trip-card-meta">{day.location}</div>}
          {day.notes && <div className="trip-card-meta">{day.notes}</div>}
        </div>
        {!readOnly &&
          (confirmingDelete ? (
            <span className="confirm-inline">
              <span className="confirm-inline-label">Delete day? Activities go too.</span>
              <button className="btn btn-danger" onClick={handleDeleteDay} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes'}
              </button>
              <button
                className="btn"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
              Delete Day
            </button>
          ))}
      </div>
      {error && <div className="error-banner">{error}</div>}

      <ConditionsWidget tripId={tripId} dayId={day.id} shareToken={shareToken} />

      {day.activities.length === 0 ? (
        <div className="empty-state">
          <p>No activities yet{!readOnly && ' — add one'}.</p>
        </div>
      ) : (
        <ul className="trip-list">
          {day.activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              tripId={tripId}
              dayId={day.id}
              activity={activity}
              readOnly={readOnly}
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

      {!readOnly &&
        (addingActivity ? (
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
        ))}
    </div>
  )
}
