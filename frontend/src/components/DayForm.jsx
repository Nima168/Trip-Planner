import { useState } from 'react'
import { createDay, updateDay } from '../api/days'

export default function DayForm({ tripId, day, onSaved, onCancel }) {
  const [date, setDate] = useState(day?.date ?? '')
  const [startTime, setStartTime] = useState(day?.start_time ?? '')
  const [endTime, setEndTime] = useState(day?.end_time ?? '')
  const [location, setLocation] = useState(day?.location ?? '')
  const [notes, setNotes] = useState(day?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setFieldErrors({})

    const payload = {
      date,
      start_time: startTime || null,
      end_time: endTime || null,
      location: location || null,
      notes: notes || null,
    }

    try {
      const saved = day ? await updateDay(tripId, day.id, payload) : await createDay(tripId, payload)
      onSaved(saved)
      if (!day) {
        setDate('')
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

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor={`day-date-${day?.id ?? 'new'}`}>Date</label>
        <input
          id={`day-date-${day?.id ?? 'new'}`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          disabled={saving}
        />
      </div>
      <div className="field">
        <label htmlFor={`day-start-${day?.id ?? 'new'}`}>Start time</label>
        <input
          id={`day-start-${day?.id ?? 'new'}`}
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          disabled={saving}
        />
      </div>
      <div className="field">
        <label htmlFor={`day-end-${day?.id ?? 'new'}`}>End time</label>
        <input
          id={`day-end-${day?.id ?? 'new'}`}
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          disabled={saving}
        />
        {fieldErrors.end_time && (
          <span className="field-error">End time must be on or after start time.</span>
        )}
      </div>
      <div className="field">
        <label htmlFor={`day-location-${day?.id ?? 'new'}`}>Location</label>
        <input
          id={`day-location-${day?.id ?? 'new'}`}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Paris"
          disabled={saving}
        />
      </div>
      <div className="field">
        <label htmlFor={`day-notes-${day?.id ?? 'new'}`}>Notes</label>
        <input
          id={`day-notes-${day?.id ?? 'new'}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={saving}
        />
      </div>
      <div className="entity-form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
      {error && !fieldErrors.end_time && <div className="field-error">{error}</div>}
    </form>
  )
}
