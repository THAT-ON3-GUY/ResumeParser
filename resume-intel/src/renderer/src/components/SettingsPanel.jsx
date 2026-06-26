import { useCallback, useEffect, useState } from 'react'

function KeyStatus({ value }) {
  const set = Boolean(value && String(value).trim())
  return (
    <span className={`badge ${set ? 'badge-found' : 'badge-missing'}`}>{set ? 'Set' : 'Not set'}</span>
  )
}

function PasswordField({ label, value, onChange, savedFlash, testId, statusTestId }) {
  const [show, setShow] = useState(false)
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, fontSize: 12 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        <span data-testid={statusTestId}>
          <KeyStatus value={value} />
        </span>
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          data-testid={testId}
          style={{
            flex: 1,
            padding: '5px 10px',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 12,
            background: 'var(--surface-2)'
          }}
        />
        <button type="button" className="btn" onClick={() => setShow((s) => !s)}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {savedFlash ? (
        <span style={{ fontSize: 11, color: 'var(--badge-found-text)' }}>Saved</span>
      ) : null}
    </label>
  )
}

const blockStyle = {
  background: 'var(--surface-2)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '12px 16px',
  marginBottom: 12
}

export default function SettingsPanel({ onClearAllData, onBack }) {
  const [settings, setSettings] = useState(null)
  const [flashKey, setFlashKey] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    window.electron
      .getSettings()
      .then(setSettings)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const unsub = window.electron.onLinkedInConnected?.((next) => {
      setSettings(next)
    })
    return () => unsub?.()
  }, [])

  const save = useCallback(async (key, value) => {
    try {
      const next = await window.electron.setSetting(key, value)
      setSettings(next)
      setFlashKey(key)
      setTimeout(() => setFlashKey((k) => (k === key ? null : k)), 1500)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const openLink = (url) => {
    window.electron.openExternal(url)
  }

  const handleClearAll = async () => {
    const ok = window.confirm('Delete all saved candidate records? This cannot be undone.')
    if (!ok) return
    await window.electron.clearAllCandidates()
    onClearAllData?.()
  }

  const handleLinkedInDisconnect = async () => {
    const next = await window.electron.disconnectLinkedIn()
    setSettings(next)
  }

  const handleLinkedInConnect = async () => {
    try {
      setError(null)
      const next = await window.electron.connectLinkedIn()
      setSettings(next)
    } catch (err) {
      setError(err?.message ?? String(err))
    }
  }

  if (error) {
    return (
      <p style={{ padding: 16, fontSize: 12, color: 'var(--badge-low-text)' }}>Settings error: {error}</p>
    )
  }

  if (!settings) {
    return <p style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>Loading settings…</p>
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 16 }} data-testid="settings-panel">
      <section style={blockStyle}>
        <div className="sidebar-section-label" style={{ padding: '0 0 8px' }}>
          AI provider
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <label className="btn" style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name="aiProvider"
              checked={settings.aiProvider === 'gemini'}
              onChange={() => save('aiProvider', 'gemini')}
              data-testid="settings-ai-gemini"
            />
            Gemini (free)
          </label>
          <label className="btn" style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name="aiProvider"
              checked={settings.aiProvider === 'claude'}
              onChange={() => save('aiProvider', 'claude')}
              data-testid="settings-ai-claude"
            />
            Claude (paid)
          </label>
        </div>
        {flashKey === 'aiProvider' ? (
          <span style={{ fontSize: 11, color: 'var(--badge-found-text)' }}>Saved</span>
        ) : null}
      </section>

      <section style={blockStyle}>
        <div className="sidebar-section-label" style={{ padding: '0 0 8px' }}>
          API keys
        </div>
        <PasswordField
          label="Gemini API key"
          value={settings.geminiApiKey ?? ''}
          onChange={(v) => save('geminiApiKey', v)}
          savedFlash={flashKey === 'geminiApiKey'}
          testId="settings-gemini-key"
          statusTestId="settings-gemini-status"
        />
        <button
          type="button"
          className="btn"
          onClick={() => openLink('https://aistudio.google.com')}
          data-testid="settings-link-gemini"
        >
          Get a free key at aistudio.google.com
        </button>

        <PasswordField
          label="Claude API key"
          value={settings.claudeApiKey ?? ''}
          onChange={(v) => save('claudeApiKey', v)}
          savedFlash={flashKey === 'claudeApiKey'}
          testId="settings-claude-key"
          statusTestId="settings-claude-status"
        />
        <button
          type="button"
          className="btn"
          onClick={() => openLink('https://console.anthropic.com')}
          data-testid="settings-link-claude"
        >
          Get a key at console.anthropic.com
        </button>

        <PasswordField
          label="Google Custom Search API key (optional)"
          value={settings.googleSearchApiKey ?? ''}
          onChange={(v) => save('googleSearchApiKey', v)}
          savedFlash={flashKey === 'googleSearchApiKey'}
        />
        <PasswordField
          label="Google CX ID (optional)"
          value={settings.googleCxId ?? ''}
          onChange={(v) => save('googleCxId', v)}
          savedFlash={flashKey === 'googleCxId'}
        />
      </section>

      <section style={blockStyle}>
        <div className="sidebar-section-label" style={{ padding: '0 0 8px' }}>
          LinkedIn
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
          Status:{' '}
          <span
            className={`badge ${settings.linkedinConnected ? 'badge-found' : 'badge-missing'}`}
            data-testid="settings-linkedin-status"
          >
            {settings.linkedinConnected ? 'Connected' : 'Not connected'}
          </span>
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
          Sign in once in a browser window. Only session cookies are stored locally.
        </p>
        {settings.linkedinConnected ? (
          <button type="button" className="btn" onClick={handleLinkedInDisconnect} data-testid="settings-linkedin-disconnect">
            Disconnect LinkedIn
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleLinkedInConnect} data-testid="settings-linkedin-connect">
            Connect LinkedIn
          </button>
        )}
      </section>

      <section style={blockStyle}>
        <div className="sidebar-section-label" style={{ padding: '0 0 8px' }}>
          Search behavior
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, marginBottom: 8 }}>
          <span>Search delay between requests: {settings.searchDelaySeconds}s</span>
          <input
            type="range"
            min={2}
            max={10}
            value={settings.searchDelaySeconds ?? 7}
            onChange={(e) => save('searchDelaySeconds', Number(e.target.value))}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={Boolean(settings.autoSearchOnUpload)}
            onChange={(e) => save('autoSearchOnUpload', e.target.checked)}
          />
          Auto-search on upload
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          <span>Default export format</span>
          <select
            value={settings.defaultExportFormat ?? 'csv'}
            onChange={(e) => save('defaultExportFormat', e.target.value)}
            style={{
              padding: '5px 10px',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: 12,
              background: 'var(--surface-2)'
            }}
          >
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
          </select>
        </label>
      </section>

      <section style={{ ...blockStyle, borderColor: 'var(--border-strong)' }}>
        <div className="sidebar-section-label" style={{ padding: '0 0 8px' }}>
          Data management
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
          Removes all candidate records from local SQLite storage.
        </p>
        <button type="button" className="btn" onClick={handleClearAll} data-testid="settings-clear-all">
          Clear all data
        </button>
      </section>

      <button type="button" className="btn" onClick={onBack} data-testid="settings-back">
        ← Back to candidates
      </button>
    </div>
  )
}
