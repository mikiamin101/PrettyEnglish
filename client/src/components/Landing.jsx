import React from 'react'
import './Landing.css'
import liamImage from '../assets/image.jpg'

const PalmTree = ({ className }) => (
  <svg className={`palm-tree ${className}`} viewBox="0 0 120 220" fill="none">
    <path d="M55 220 L55 110 Q55 100 60 95 Q65 100 65 110 L65 220" fill="#8B5E3C" />
    <path d="M60 100 Q30 70 10 80 Q30 60 60 80" fill="#2D8B46" />
    <path d="M60 95 Q90 65 110 75 Q90 55 60 75" fill="#2D8B46" />
    <path d="M60 90 Q40 50 15 55 Q40 40 60 70" fill="#3DA55D" />
    <path d="M60 90 Q80 50 105 55 Q80 40 60 70" fill="#3DA55D" />
    <path d="M60 85 Q50 40 30 30 Q55 30 60 60" fill="#4BC870" />
    <path d="M60 85 Q70 40 90 30 Q65 30 60 60" fill="#4BC870" />
    <circle cx="55" cy="88" r="4" fill="#8B5E3C" />
    <circle cx="65" cy="92" r="3.5" fill="#7A5230" />
    <circle cx="58" cy="95" r="3" fill="#8B5E3C" />
  </svg>
)

function Landing({ onChooseLevel, onShowAuth, user, onGallery, onVersus }) {
  return (
    <div className="landing">
      {/* Top Bar */}
      <div className="landing-top-bar">
        <div className="love-message hebrew-text">אני אוהב אותך ליאמי 💛</div>
        <button className="auth-button" onClick={onShowAuth}>
          {user ? (
            <span className="auth-icon auth-logged-in">👤</span>
          ) : (
            <span className="auth-icon">👤</span>
          )}
        </button>
      </div>

      {/* Palm Trees */}
      <PalmTree className="palm-left-1" />
      <PalmTree className="palm-left-2" />
      <img src={liamImage} alt="Liami" className="landing-photo" />
      <PalmTree className="palm-right-1" />
      <PalmTree className="palm-right-2" />

      {/* Main Content */}
      <div className="landing-content">
        <div className="landing-title-section">
          <div className="title-sparkle sparkle-1">✨</div>
          <h1 className="landing-title bubble-text">Pretty English</h1>
          <div className="title-sparkle sparkle-2">✨</div>
          <h2 className="landing-subtitle hebrew-text">בשביל ליאמי 💕</h2>
        </div>

        <div className="landing-preview">
          <div className="preview-group">
            <h3 className="preview-label">Your Drawing ✏️</h3>
            <div className="preview-images">
              <div className="preview-placeholder">🎨</div>
              <div className="preview-placeholder">👗</div>
              <div className="preview-placeholder">✨</div>
            </div>
          </div>
          <div className="preview-arrow">→</div>
          <div className="preview-group">
            <h3 className="preview-label">AI Magic ✨</h3>
            <div className="preview-images">
              <div className="preview-placeholder glow">📸</div>
              <div className="preview-placeholder glow">💃</div>
              <div className="preview-placeholder glow">🌟</div>
            </div>
          </div>
        </div>

        <button className="choose-level-btn" onClick={onChooseLevel}>
          🎮 Choose Level
        </button>

        <div className="landing-extra-buttons">
          <button className="landing-btn versus-btn" onClick={onVersus}>
            ⚔️ 1v1 Battle
          </button>
          <button className="landing-btn gallery-btn" onClick={onGallery}>
            🖼️ Gallery
          </button>
        </div>
      </div>

      {/* Floating Decorations */}
      <span className="deco deco-1">🌺</span>
      <span className="deco deco-2">🦋</span>
      <span className="deco deco-3">🌸</span>
      <span className="deco deco-4">✨</span>
      <span className="deco deco-5">🌺</span>
      <span className="deco deco-6">🦩</span>

      {/* Wave at bottom */}
      <div className="landing-wave"></div>
    </div>
  )
}

export default Landing
