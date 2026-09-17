import { useEffect, useState } from 'react'
import { getConditions, getSharedConditions } from '../api/conditions'

function MapModal({ url, onClose }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-icon modal-close" onClick={onClose} aria-label="Close map">
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
        <iframe className="conditions-map-expanded" src={url} title="Map for this day, expanded" />
      </div>
    </div>
  )
}

export default function ConditionsWidget({ tripId, dayId, shareToken }) {
  const [state, setState] = useState({ status: 'loading' })
  const [mapExpanded, setMapExpanded] = useState(false)

  function fetchConditions() {
    const request = shareToken ? getSharedConditions(shareToken, dayId) : getConditions(tripId, dayId)
    request.then((data) => setState(data)).catch(() => setState({ status: 'unavailable' }))
  }

  useEffect(fetchConditions, [tripId, dayId, shareToken])

  function retry() {
    setState({ status: 'loading' })
    fetchConditions()
  }

  if (state.status === 'loading') {
    return <div className="conditions-widget conditions-loading">Loading weather…</div>
  }

  if (state.status === 'unavailable') {
    return (
      <div className="conditions-widget conditions-unavailable">
        Weather/map unavailable.{' '}
        <button className="btn-link" onClick={retry}>
          Retry
        </button>
      </div>
    )
  }

  const { weather, map } = state

  return (
    <div className="conditions">
      <div className="conditions-widget conditions-ok">
        <img
          className="conditions-icon"
          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
          alt={weather.summary}
          width="40"
          height="40"
        />
        <span>
          {weather.summary}, {Math.round(weather.temp_c)}°C
        </span>
      </div>
      {map?.static_map_url && (
        <>
          <div
            className="conditions-map-wrap"
            role="button"
            tabIndex={0}
            onClick={() => setMapExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setMapExpanded(true)
              }
            }}
            aria-label="Expand map"
          >
            <iframe
              className="conditions-map"
              src={map.static_map_url}
              title="Map for this day"
              loading="lazy"
              tabIndex={-1}
            />
            <span className="conditions-map-hint">
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
                <path d="M8 3H3v5M21 8V3h-5M3 16v5h5M16 21h5v-5" />
              </svg>
              Expand
            </span>
          </div>
          {mapExpanded && (
            <MapModal url={map.static_map_url} onClose={() => setMapExpanded(false)} />
          )}
        </>
      )}
    </div>
  )
}
