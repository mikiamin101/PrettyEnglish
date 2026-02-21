import React, { useState, useEffect } from 'react'
import './VersusResults.css'
import { resizeImage } from '../utils/imageUtils'
import { getThemeDisplay } from '../data/fashionThemes'

function VersusResults({ socket, onDone }) {
  const [phase, setPhase] = useState('waiting') // 'waiting' | 'processing' | 'judging' | 'done'
  const [results, setResults] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (!socket) return

    const onPhaseUpdate = ({ phase: p }) => setPhase(p)

    const onVersusResults = async (data) => {
      setResults(data)
      setPhase('done')

      // Save to gallery
      try {
        const [thumbHostDraw, thumbHostAi, thumbGuestDraw, thumbGuestAi] = await Promise.all([
          resizeImage(data.hostResult.drawing),
          resizeImage(data.hostResult.aiImage || data.hostResult.drawing),
          resizeImage(data.guestResult.drawing),
          resizeImage(data.guestResult.aiImage || data.guestResult.drawing)
        ])

        const gallery = JSON.parse(localStorage.getItem('prettyEnglishGallery') || '[]')
        gallery.push({
          id: Date.now(),
          versus: true,
          theme: data.theme,
          p1Name: data.hostName,
          p2Name: data.guestName,
          p1Drawing: thumbHostDraw,
          p2Drawing: thumbGuestDraw,
          p1AiImage: thumbHostAi,
          p2AiImage: thumbGuestAi,
          p1Score: data.hostResult.score,
          p2Score: data.guestResult.score,
          winner: data.winner === 'host' ? 'p1' : data.winner === 'guest' ? 'p2' : 'tie',
          feedback: data.verdict,
          date: new Date().toISOString()
        })
        while (gallery.length > 30) gallery.shift()
        localStorage.setItem('prettyEnglishGallery', JSON.stringify(gallery))
      } catch (err) {
        console.log('Gallery save error:', err)
      }
    }

    const onOpponentLeft = () => {
      if (phase !== 'done') {
        // Opponent left during processing — stay and wait for results from server
      }
    }

    socket.on('phaseUpdate', onPhaseUpdate)
    socket.on('versusResults', onVersusResults)
    socket.on('opponentLeft', onOpponentLeft)

    return () => {
      socket.off('phaseUpdate', onPhaseUpdate)
      socket.off('versusResults', onVersusResults)
      socket.off('opponentLeft', onOpponentLeft)
    }
  }, [socket, phase])

  const getWinnerName = () => {
    if (!results) return null
    if (results.winner === 'host') return results.hostName
    if (results.winner === 'guest') return results.guestName
    return null
  }

  return (
    <div className="versus-results">
      {phase !== 'done' || !results ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <h2 className="bubble-text loading-title">
            {phase === 'judging' ? '⚖️ Judging...' : '✨ Creating AI Magic...'}
          </h2>
          <p className="loading-sub">
            {phase === 'judging'
              ? 'The AI is picking a winner...'
              : phase === 'waiting'
                ? 'Waiting for both drawings...'
                : 'Transforming both designs!'}
          </p>
        </div>
      ) : (
        <div className="versus-results-content">
          <h2 className="bubble-text versus-results-heading">⚔️ Battle Results!</h2>
          <h3 className="versus-results-theme">{getThemeDisplay(results.theme)}</h3>

          <div className="versus-results-cards">
            <div className={`versus-result-card ${results.winner === 'host' ? 'winner-card' : ''}`}>
              {results.winner === 'host' && <div className="winner-crown">🏆</div>}
              <h4 className="versus-player-name">{results.hostName}</h4>
              <img
                src={results.hostResult.aiImage || results.hostResult.drawing}
                alt={results.hostName}
                className="versus-result-img"
                onClick={() => setLightbox(results.hostResult.aiImage || results.hostResult.drawing)}
              />
              <span className="versus-player-score">{results.hostResult.score?.toFixed(1)}/10</span>
            </div>

            <div className="versus-results-middle">
              <span className="versus-results-vs">VS</span>
            </div>

            <div className={`versus-result-card ${results.winner === 'guest' ? 'winner-card' : ''}`}>
              {results.winner === 'guest' && <div className="winner-crown">🏆</div>}
              <h4 className="versus-player-name">{results.guestName}</h4>
              <img
                src={results.guestResult.aiImage || results.guestResult.drawing}
                alt={results.guestName}
                className="versus-result-img"
                onClick={() => setLightbox(results.guestResult.aiImage || results.guestResult.drawing)}
              />
              <span className="versus-player-score">{results.guestResult.score?.toFixed(1)}/10</span>
            </div>
          </div>

          <div className="versus-verdict-section">
            {results.winner === 'tie' ? (
              <h3 className="versus-verdict-title">🤝 It's a Tie!</h3>
            ) : (
              <h3 className="versus-verdict-title">🏆 {getWinnerName()} Wins!</h3>
            )}
            {results.verdict && <p className="versus-verdict-text">{results.verdict}</p>}
          </div>

          <button className="versus-done-btn" onClick={onDone}>
            🏠 Back to Menu
          </button>
        </div>
      )}

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" className="lightbox-img" />
          <span className="lightbox-close">✕</span>
        </div>
      )}
    </div>
  )
}

export default VersusResults
