import React, { useState, useEffect } from 'react'
import './Gallery.css'

function Gallery({ onBack }) {
  const [gallery, setGallery] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const saved = localStorage.getItem('prettyEnglishGallery')
    if (saved) {
      try {
        setGallery(JSON.parse(saved).reverse())
      } catch {
        setGallery([])
      }
    }
  }, [])

  const filtered = gallery.filter(entry => {
    if (filter === 'all') return true
    if (filter === 'levels') return !entry.versus
    if (filter === '1v1') return entry.versus
    return true
  })

  return (
    <div className="gallery">
      <button className="back-btn gallery-back" onClick={onBack}>← Back</button>
      <h1 className="bubble-text gallery-title">🖼️ Gallery</h1>

      <div className="gallery-filters">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-btn ${filter === 'levels' ? 'active' : ''}`} onClick={() => setFilter('levels')}>Levels</button>
        <button className={`filter-btn ${filter === '1v1' ? 'active' : ''}`} onClick={() => setFilter('1v1')}>1v1</button>
      </div>

      {filtered.length === 0 ? (
        <p className="gallery-empty">No designs yet! Play some levels to fill your gallery ✨</p>
      ) : (
        <div className="gallery-grid">
          {filtered.map((entry, i) => (
            <div key={i} className="gallery-card" onClick={() => setLightbox(entry)}>
              <img
                src={entry.versus ? (entry.p1AiImage || entry.p1Drawing) : (entry.aiImage || entry.drawing)}
                alt={entry.theme}
                className="gallery-img"
              />
              <div className="gallery-card-info">
                <span className="gallery-theme">{entry.theme}</span>
                {entry.versus ? (
                  <span className="gallery-versus-badge">⚔️ {entry.p1Name} vs {entry.p2Name}</span>
                ) : (
                  entry.score && <span className="gallery-score">⭐ {entry.score}/10</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="gallery-lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="gallery-lightbox" onClick={e => e.stopPropagation()}>
            <span className="gallery-lightbox-close" onClick={() => setLightbox(null)}>✕</span>

            {lightbox.versus ? (
              <>
                <h3 className="gallery-lightbox-title">⚔️ {lightbox.theme}</h3>
                <div className="gallery-lightbox-versus">
                  <div className="gallery-lightbox-player">
                    <h4 className={lightbox.winner === 'p1' ? 'winner-name' : ''}>{lightbox.p1Name} {lightbox.winner === 'p1' ? '🏆' : ''}</h4>
                    <img src={lightbox.p1AiImage || lightbox.p1Drawing} alt={lightbox.p1Name} />
                    {lightbox.p1Score && <span className="gallery-lb-score">{lightbox.p1Score}/10</span>}
                  </div>
                  <span className="gallery-lightbox-vs">VS</span>
                  <div className="gallery-lightbox-player">
                    <h4 className={lightbox.winner === 'p2' ? 'winner-name' : ''}>{lightbox.p2Name} {lightbox.winner === 'p2' ? '🏆' : ''}</h4>
                    <img src={lightbox.p2AiImage || lightbox.p2Drawing} alt={lightbox.p2Name} />
                    {lightbox.p2Score && <span className="gallery-lb-score">{lightbox.p2Score}/10</span>}
                  </div>
                </div>
                {lightbox.winner === 'tie' && <p className="gallery-lb-tie">🤝 It's a tie!</p>}
                {lightbox.feedback && <p className="gallery-lb-feedback">{lightbox.feedback}</p>}
              </>
            ) : (
              <>
                <h3 className="gallery-lightbox-title">🎨 {lightbox.theme}</h3>
                <div className="gallery-lightbox-images">
                  <div className="gallery-lightbox-side">
                    <h4>Your Design ✏️</h4>
                    <img src={lightbox.drawing} alt="Drawing" />
                  </div>
                  <div className="gallery-lightbox-side">
                    <h4>AI Version ✨</h4>
                    <img src={lightbox.aiImage || lightbox.drawing} alt="AI" />
                  </div>
                </div>
                {lightbox.score && <p className="gallery-lb-score-big">Score: {lightbox.score}/10</p>}
                {lightbox.feedback && <p className="gallery-lb-feedback">{lightbox.feedback}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Gallery
