import React, { useState, useEffect } from 'react'
import './Versus.css'
import { fashionThemes } from '../data/fashionThemes'

function Versus({ socket, onStartDrawing, onBack }) {
  const [mode, setMode] = useState('menu') // 'menu' | 'create' | 'join' | 'lobby'
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [useTimer, setUseTimer] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(3)
  const [themeMode, setThemeMode] = useState('random')
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [error, setError] = useState('')
  const [lobbyInfo, setLobbyInfo] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!socket) return

    const onRoomCreated = ({ code }) => {
      setRoomCode(code)
      setMode('lobby')
    }

    const onRoomReady = (info) => {
      setLobbyInfo(info)
      setTimeout(() => onStartDrawing(info), 2500)
    }

    const onError = ({ message }) => {
      setError(message)
      setTimeout(() => setError(''), 4000)
    }

    const onOpponentLeft = () => {
      setError('Opponent left the room!')
      setLobbyInfo(null)
      setMode('menu')
      setTimeout(() => setError(''), 4000)
    }

    socket.on('roomCreated', onRoomCreated)
    socket.on('roomReady', onRoomReady)
    socket.on('error', onError)
    socket.on('opponentLeft', onOpponentLeft)

    return () => {
      socket.off('roomCreated', onRoomCreated)
      socket.off('roomReady', onRoomReady)
      socket.off('error', onError)
      socket.off('opponentLeft', onOpponentLeft)
    }
  }, [socket, onStartDrawing])

  const handleCreate = () => {
    if (!playerName.trim()) return
    socket.emit('createRoom', {
      playerName: playerName.trim(),
      useTimer,
      timerMinutes,
      themeMode,
      selectedTheme
    })
  }

  const handleJoin = () => {
    if (!playerName.trim() || !joinCode.trim()) return
    socket.emit('joinRoom', {
      code: joinCode.trim().toUpperCase(),
      playerName: playerName.trim()
    })
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleBack = () => {
    if (mode === 'lobby' || mode === 'create' || mode === 'join') {
      if (mode === 'lobby') socket.emit('leaveRoom')
      setMode('menu')
      setRoomCode('')
      setLobbyInfo(null)
    } else {
      onBack()
    }
  }

  // ── Found opponent — show countdown ──
  if (lobbyInfo) {
    return (
      <div className="versus">
        <div className="versus-ready-screen">
          <h2 className="bubble-text versus-title">⚔️ Battle Found!</h2>
          <div className="versus-matchup">
            <span className="versus-matchup-name">{lobbyInfo.hostName}</span>
            <span className="versus-matchup-vs">VS</span>
            <span className="versus-matchup-name">{lobbyInfo.guestName}</span>
          </div>
          <div className="versus-theme-reveal">
            <span className="versus-theme-label">Theme:</span>
            <span className="versus-theme-name">{lobbyInfo.theme}</span>
          </div>
          {lobbyInfo.timerSeconds && (
            <p className="versus-timer-info">⏱ {lobbyInfo.timerSeconds / 60} min timer</p>
          )}
          <div className="loading-spinner" />
          <p className="versus-starting-text">Starting soon...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="versus">
      <button className="back-btn versus-back" onClick={handleBack}>← Back</button>
      <h1 className="bubble-text versus-title">⚔️ 1v1 Fashion Battle</h1>
      <p className="versus-subtitle">Play online against a friend!</p>

      {error && <div className="versus-error">{error}</div>}

      {mode === 'menu' && (
        <div className="versus-form">
          <div className="versus-name-group" style={{ width: '100%' }}>
            <label className="versus-label">Your Name</label>
            <input
              className="versus-input"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              maxLength={15}
            />
          </div>

          <div className="versus-menu-buttons">
            <button
              className="versus-menu-btn create-btn"
              onClick={() => playerName.trim() ? setMode('create') : setError('Enter your name first!')}
            >
              🏠 Create Room
            </button>
            <button
              className="versus-menu-btn join-btn"
              onClick={() => playerName.trim() ? setMode('join') : setError('Enter your name first!')}
            >
              🚪 Join Room
            </button>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <div className="versus-form">
          <p className="versus-form-desc">Set up your battle rules, then share the code!</p>

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
            onClick={handleCreate}
            disabled={themeMode === 'choose' && !selectedTheme}
          >
            🏠 Create Room
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="versus-form">
          <p className="versus-form-desc">Enter the room code from your friend</p>
          <div className="versus-name-group" style={{ width: '100%' }}>
            <label className="versus-label">Room Code</label>
            <input
              className="versus-input room-code-input"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXXX"
              maxLength={5}
              style={{ textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center', fontSize: '24px' }}
            />
          </div>
          <button
            className="versus-start-btn"
            onClick={handleJoin}
            disabled={joinCode.trim().length < 5}
          >
            🚪 Join Battle!
          </button>
        </div>
      )}

      {mode === 'lobby' && (
        <div className="versus-form">
          <div className="lobby-waiting">
            <h3 className="lobby-title">Room Created! 🎉</h3>
            <div className="lobby-code-section">
              <span className="lobby-code-label">Share this code:</span>
              <div className="lobby-code-display" onClick={handleCopyCode}>
                <span className="lobby-code">{roomCode}</span>
                <span className="lobby-copy-icon">{copied ? '✅' : '📋'}</span>
              </div>
              {copied && <span className="lobby-copied-text">Copied!</span>}
            </div>
            <div className="lobby-waiting-animation">
              <div className="loading-spinner" />
              <p className="lobby-waiting-text">Waiting for opponent to join...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Versus
