import React, { useState } from 'react'
import './Versus.css'
import { fashionThemes } from '../data/fashionThemes'

function Versus({ onStart, onBack }) {
  const [p1Name, setP1Name] = useState('')
  const [p2Name, setP2Name] = useState('')
  const [useTimer, setUseTimer] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(3)
  const [themeMode, setThemeMode] = useState('random')
  const [selectedTheme, setSelectedTheme] = useState(null)

  const getUsedThemesKey = () => {
    return `prettyEnglishVersusUsed_${[p1Name.trim(), p2Name.trim()].sort().join('_')}`
  }

  const handleStart = () => {
    if (!p1Name.trim() || !p2Name.trim()) return
    if (p1Name.trim() === p2Name.trim()) {
      alert('Use different names!')
      return
    }

    let theme
    if (themeMode === 'choose' && selectedTheme) {
      theme = selectedTheme
    } else {
      // Random — avoid repeats for same two players
      const key = getUsedThemesKey()
      let used = []
      try { used = JSON.parse(localStorage.getItem(key) || '[]') } catch {}
      const available = fashionThemes.filter((_, i) => !used.includes(i))
      if (available.length === 0) {
        // Reset — all themes used
        localStorage.removeItem(key)
        theme = fashionThemes[Math.floor(Math.random() * fashionThemes.length)]
      } else {
        theme = available[Math.floor(Math.random() * available.length)]
      }
    }

    // Track used theme
    try {
      const key = getUsedThemesKey()
      let used = []
      try { used = JSON.parse(localStorage.getItem(key) || '[]') } catch {}
      const idx = fashionThemes.indexOf(theme)
      if (idx >= 0 && !used.includes(idx)) {
        used.push(idx)
        localStorage.setItem(key, JSON.stringify(used))
      }
    } catch {}

    onStart({
      p1Name: p1Name.trim(),
      p2Name: p2Name.trim(),
      theme,
      timerSeconds: useTimer ? timerMinutes * 60 : null
    })
  }

  const canStart = p1Name.trim() && p2Name.trim() && (themeMode === 'random' || selectedTheme)

  return (
    <div className="versus">
      <button className="back-btn versus-back" onClick={onBack}>← Back</button>
      <h1 className="bubble-text versus-title">⚔️ 1v1 Fashion Battle</h1>

      <div className="versus-form">
        <div className="versus-names">
          <div className="versus-name-group">
            <label className="versus-label">Player 1 👩‍🎨</label>
            <input
              className="versus-input"
              value={p1Name}
              onChange={e => setP1Name(e.target.value)}
              placeholder="Name..."
              maxLength={15}
            />
          </div>
          <span className="versus-vs-text">VS</span>
          <div className="versus-name-group">
            <label className="versus-label">Player 2 🎨</label>
            <input
              className="versus-input"
              value={p2Name}
              onChange={e => setP2Name(e.target.value)}
              placeholder="Name..."
              maxLength={15}
            />
          </div>
        </div>

        <div className="versus-option">
          <label className="versus-label">⏱ Timer</label>
          <div className="versus-toggle-row">
            <button className={`toggle-btn ${!useTimer ? 'active' : ''}`} onClick={() => setUseTimer(false)}>Off</button>
            <button className={`toggle-btn ${useTimer ? 'active' : ''}`} onClick={() => setUseTimer(true)}>On</button>
          </div>
          {useTimer && (
            <div className="timer-options">
              {[1, 2, 3, 5].map(m => (
                <button
                  key={m}
                  className={`timer-btn ${timerMinutes === m ? 'active' : ''}`}
                  onClick={() => setTimerMinutes(m)}
                >
                  {m} min
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="versus-option">
          <label className="versus-label">🎨 Theme</label>
          <div className="versus-toggle-row">
            <button className={`toggle-btn ${themeMode === 'random' ? 'active' : ''}`} onClick={() => setThemeMode('random')}>🎲 Random</button>
            <button className={`toggle-btn ${themeMode === 'choose' ? 'active' : ''}`} onClick={() => setThemeMode('choose')}>📋 Choose</button>
          </div>
          {themeMode === 'choose' && (
            <div className="theme-grid">
              {fashionThemes.map((t, i) => (
                <button
                  key={i}
                  className={`theme-option ${selectedTheme === t ? 'active' : ''}`}
                  onClick={() => setSelectedTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="versus-start-btn"
          onClick={handleStart}
          disabled={!canStart}
        >
          ⚔️ Start Battle!
        </button>
      </div>
    </div>
  )
}

export default Versus
