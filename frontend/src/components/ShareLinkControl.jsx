import { useEffect, useState } from 'react'
import { createShareLink } from '../api/share'

export default function ShareLinkControl({ tripId }) {
  const [state, setState] = useState({ status: 'idle' })
  const [fallbackCopied, setFallbackCopied] = useState(false)

  useEffect(() => {
    if (state.status !== 'copied') return
    const timer = setTimeout(() => setState({ status: 'idle' }), 2000)
    return () => clearTimeout(timer)
  }, [state.status])

  async function handleShare() {
    setState({ status: 'generating' })
    try {
      const { token } = await createShareLink(tripId)
      const url = `${window.location.origin}/share/${token}`
      try {
        await navigator.clipboard.writeText(url)
        setState({ status: 'copied', url })
      } catch {
        // clipboard access denied -- fall back to a visible, manually-copyable link
        setState({ status: 'fallback', url })
      }
    } catch (err) {
      setState({ status: 'error', error: err.message })
    }
  }

  async function copyFallback() {
    try {
      await navigator.clipboard.writeText(state.url)
      setFallbackCopied(true)
      setTimeout(() => setFallbackCopied(false), 2000)
    } catch {
      // clipboard access denied -- the URL is still visible in the input for manual copy
    }
  }

  if (state.status === 'generating') {
    return (
      <button className="btn" disabled>
        Generating…
      </button>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="field-error">
        Couldn't generate link: {state.error}{' '}
        <button className="btn-link" onClick={handleShare}>
          Retry
        </button>
      </div>
    )
  }

  if (state.status === 'fallback') {
    return (
      <div className="share-link-control">
        <input
          className="share-link-input"
          readOnly
          value={state.url}
          onFocus={(e) => e.target.select()}
        />
        <button className="btn" onClick={copyFallback}>
          {fallbackCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    )
  }

  return (
    <button
      className={`btn${state.status === 'copied' ? ' btn-success' : ''}`}
      onClick={handleShare}
      title={state.status === 'copied' ? 'Link copied to clipboard' : 'Copy a shareable link'}
    >
      {state.status === 'copied' ? (
        <span className="btn-with-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Link copied
        </span>
      ) : (
        'Share trip'
      )}
    </button>
  )
}
