import { useCallback, useEffect, useState } from 'react'

function KeyStatus({ value }) {
  const set = Boolean(value && String(value).trim())
  return (
    <span className={`key-status ${set ? 'key-set' : 'key-unset'}`}>{set ? 'Set' : 'Not set'}</span>
  )
}

function PasswordField({ label, value, onChange, savedFlash, testId, statusTestId }) {
  const [show, setShow] = useState(false)
  return (
    <label className="settings-field">
      <span className="settings-label-row">
        <span>{label}</span>
        <span data-testid={statusTestId}>
          <KeyStatus value={value} />
        </span>
      </span>
      <div className="password-row">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          data-testid={testId}
        />
        <button type="button" className="btn-ghost" onClick={() => setShow((s) => !s)}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {savedFlash ? <span className="saved-flash">Saved ✓</span> : null}
    </label>
  )
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
    const ok = window.confirm(
      'Delete all saved candidate records? This cannot be undone.'
    )
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
    return <p className="settings-error">Settings error: {error}</p>
  }

  if (!settings) {
    return <p className="empty-table">Loading settings…</p>
  }

  return (
    <div className="settings-panel" data-testid="settings-panel">
      <header className="settings-header">
        <h2>Settings</h2>
        <button type="button" className="btn-ghost" onClick={onBack} data-testid="settings-back">
          ← Back to candidates
        </button>
      </header>

      <section className="settings-section">
        <h3>AI provider</h3>
        <div className="toggle-row">
          <label className="radio-pill">
            <input
              type="radio"
              name="aiProvider"
              checked={settings.aiProvider === 'gemini'}
              onChange={() => save('aiProvider', 'gemini')}
              data-testid="settings-ai-gemini"
            />
            Gemini (free)
          </label>
          <label className="radio-pill">
            <input
              type="radio"
              name="aiProvider"
              checked={settings.aiProvider === 'claude'}
              onChange={() => save('aiProvider', 'claude')}
              data-testid="settings-ai-claude"
            />
            Claude (paid, higher accuracy)
          </label>
        </div>
        {flashKey === 'aiProvider' ? <span className="saved-flash">Saved ✓</span> : null}
      </section>

      <section className="settings-section">
        <h3>API keys</h3>
        <PasswordField
          label="Gemini API key"
          value={settings.geminiApiKey ?? ''}
          onChange={(v) => save('geminiApiKey', v)}
          savedFlash={flashKey === 'geminiApiKey'}
          testId="settings-gemini-key"
          statusTestId="settings-gemini-status"
        />
        <p className="settings-helper">
          <button
            type="button"
            className="link-btn"
            onClick={() => openLink('https://aistudio.google.com')}
            data-testid="settings-link-gemini"
          >
            Get a free key at aistudio.google.com →
          </button>
        </p>

        <PasswordField
          label="Claude API key"
          value={settings.claudeApiKey ?? ''}
          onChange={(v) => save('claudeApiKey', v)}
          savedFlash={flashKey === 'claudeApiKey'}
          testId="settings-claude-key"
          statusTestId="settings-claude-status"
        />
        <p className="settings-helper">
          <button
            type="button"
            className="link-btn"
            onClick={() => openLink('https://console.anthropic.com')}
            data-testid="settings-link-claude"
          >
            Get a key at console.anthropic.com →
          </button>
          {' · '}
          <span className="settings-muted">~$0.01–0.02 per resume</span>
        </p>

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

      <section className="settings-section">
        <h3>LinkedIn</h3>
        <p className="settings-muted">
          Status:{' '}
          <span
            className={settings.linkedinConnected ? 'status-linked-in-on' : 'status-linked-in-off'}
            data-testid="settings-linkedin-status"
          >
            {settings.linkedinConnected ? 'Connected' : 'Not connected'}
          </span>
        </p>
        <p className="settings-muted">
          Sign in once in a browser window. Only session cookies are stored locally — never your password.
        </p>
        {settings.linkedinConnected ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={handleLinkedInDisconnect}
            data-testid="settings-linkedin-disconnect"
          >
            Disconnect LinkedIn
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost"
            onClick={handleLinkedInConnect}
            data-testid="settings-linkedin-connect"
          >
            Connect LinkedIn
          </button>
        )}
      </section>

      <section className="settings-section">
        <h3>Search behavior</h3>
        <label className="settings-field">
          <span>
            Search delay between requests: {settings.searchDelaySeconds}s
          </span>
          <input
            type="range"
            min={2}
            max={10}
            value={settings.searchDelaySeconds ?? 7}
            onChange={(e) => save('searchDelaySeconds', Number(e.target.value))}
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={Boolean(settings.autoSearchOnUpload)}
            onChange={(e) => save('autoSearchOnUpload', e.target.checked)}
          />
          Auto-search on upload
        </label>
        <label className="settings-field">
          <span>Default export format</span>
          <select
            value={settings.defaultExportFormat ?? 'csv'}
            onChange={(e) => save('defaultExportFormat', e.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
          </select>
        </label>
      </section>

      <section className="settings-section settings-danger">
        <h3>Data management</h3>
        <p className="settings-muted">Removes all candidate records from local SQLite storage.</p>
        <button type="button" className="btn-delete" onClick={handleClearAll} data-testid="settings-clear-all">
          Clear all data
        </button>
      </section>
    </div>
  )
}
