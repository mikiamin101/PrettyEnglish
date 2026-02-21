import React, { useState } from 'react'
import './LevelSelect.css'
import { levels } from '../data/levels'
import { getLevelThemeDisplay } from '../data/fashionThemes'

function LevelSelect({ progress, onSelectLevel, onBack, onViewResult }) {
  const [selectedCompleted, setSelectedCompleted] = useState(null)

  const renderStars = (levelNum) => {
    const stars = progress[levelNum] || 0
    return (
      <div className="level-stars">
        {[1, 2, 3].map(i => (
          <span key={i} className={`star ${i <= stars ? 'star-filled' : 'star-empty'}`}>
            ★
          </span>
        ))}
      </div>
    )
  }

  const isLevelUnlocked = (levelNum) => {
    if (levelNum === 1) return true
    return (progress[levelNum - 1] || 0) >= 1
  }

  const handleLevelClick = (levelId) => {
    if ((progress[levelId] || 0) > 0) {
      setSelectedCompleted(levelId)
    } else {
      onSelectLevel(levelId)
    }
  }

  return (
    <div className="level-select">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <h1 className="levels-header bubble-text">Levels</h1>

      <div className="levels-grid">
        {levels.map((level) => {
          const unlocked = isLevelUnlocked(level.id)
          return (
            <button
              key={level.id}
              className={`level-box ${unlocked ? 'unlocked' : 'locked'}`}
              onClick={() => unlocked && handleLevelClick(level.id)}
              disabled={!unlocked}
            >
              <div className="level-number">{level.id}</div>
              <div className="level-theme">{getLevelThemeDisplay(level.theme).he}</div>
              {renderStars(level.id)}
              {!unlocked && <div className="lock-overlay">🔒</div>}
            </button>
          )
        })}
      </div>

      {selectedCompleted && (
        <div className="level-popup-overlay" onClick={() => setSelectedCompleted(null)}>
          <div className="level-popup" onClick={e => e.stopPropagation()}>
            <h3 className="level-popup-title">Level {selectedCompleted}</h3>
            <p className="level-popup-theme">{getLevelThemeDisplay(levels.find(l => l.id === selectedCompleted)?.theme).he}</p>
            <p className="level-popup-desc">{getLevelThemeDisplay(levels.find(l => l.id === selectedCompleted)?.theme).desc}</p>
            <div className="level-popup-buttons">
              <button className="level-popup-btn play-btn" onClick={() => { setSelectedCompleted(null); onSelectLevel(selectedCompleted) }}>
                ▶ Play Again
              </button>
              <button className="level-popup-btn view-btn" onClick={() => { setSelectedCompleted(null); onViewResult(selectedCompleted) }}>
                👁 View Previous
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LevelSelect
