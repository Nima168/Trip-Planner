import { useState } from 'react'
import { createActivity, updateActivity } from '../api/activities'

export default function ActivityForm({ tripId, dayId, activity, onSaved, onCancel }) {
  const [title, setTitle] = useState(activity?.title ?? '')
  const [startTime, setStartTime] = useState(activity?.start_time ?? '')
  const [endTime, setEndTime] = useState(activity?.end_time ?? '')
  const [location, setLocation] = useState(activity?.location ?? '')
  const [notes, setNotes] = useState(activity?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setFieldErrors({})

    const payload = {
      title,
      start_time: startTime,
      end_time: endTime,
      location: location || null,
      notes: notes || null,
    }

    try {
      const saved = activity
        ? await updateActivity(tripId, dayId, activity.id, payload)
        : await createActivity(tripId, dayId, payload)
      onSaved(saved)
      if (!activity) {
        setTitle('')
        setStartTime('')
        setEndTime('')
        setLocation('')
        setNotes('')
      }
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fields ?? {})
    } finally {
      setSaving(false)
    }
  }

  const idBase = activity?.id ?? `new-${dayId}`

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor={`activity-title-${idBase}`}>Title</label>
        <input
          id={`activity-title-${idBase}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={saving}
        />
        {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
      </div>
      <div className="field">
        <label htmlFor={`activity-start-${idBase}`}>Start time</label>
        <input
          id={`activity-start-${idBase}`}
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
          disabled={saving}
        />
      </div>
      <div className="field">
        <label htmlFor={`activity-end-${idBase}`}>End time</label>
        <input
          id={`activity-end-${idBase}`}
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
          disabled={saving}
        />
        {fieldErrors.end_time && (
          <span className="field-error">End time must be on or after start time.</span>
        )}
      </div>
      <div className="field">
        <label htmlFor={`activity-location-${idBase}`}>Location</label>
        <input
          id={`activity-location-${idBase}`}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={saving}
        />
      </div>
      <div className="field">
        <label htmlFor={`activity-notes-${idBase}`}>Notes</label>
        <input
          id={`activity-notes-${idBase}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={saving}
        />
      </div>
      <div className="entity-form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
      {error && !fieldErrors.title && !fieldErrors.end_time && (
        <div className="field-error">{error}</div>
      )}
    </form>
  )
}
