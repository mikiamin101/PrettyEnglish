import React from 'react'
import './LevelSelect.css'
import { levels } from '../data/levels'

function LevelSelect({ progress, onSelectLevel, onBack }) {
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
              onClick={() => unlocked && onSelectLevel(level.id)}
              disabled={!unlocked}
            >
              <div className="level-number">{level.id}</div>
              <div className="level-theme">{level.theme}</div>
              {renderStars(level.id)}
              {!unlocked && <div className="lock-overlay">🔒</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default LevelSelect
