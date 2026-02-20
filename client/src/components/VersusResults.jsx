import React, { useState, useEffect } from 'react'
import './VersusResults.css'
import { resizeImage } from '../utils/imageUtils'

function VersusResults({ config, p1Data, p2Data, onDone }) {
  const [phase, setPhase] = useState('processing') // 'processing' | 'judging' | 'done'
  const [p1Result, setP1Result] = useState(null)
  const [p2Result, setP2Result] = useState(null)
  const [winner, setWinner] = useState(null)
  const [verdict, setVerdict] = useState('')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    processAndJudge()
  }, [])

  const processDrawing = async (data) => {
    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawing: data.drawing,
          theme: data.theme,
          mannequin: data.mannequin,
          outfitItems: data.outfitItems || []
        })
      })
      if (response.ok) {
        const result = await response.json()
        return { aiImage: result.generatedImage, score: result.score, feedback: result.feedback }
      }
    } catch (err) {
      console.error('Process error:', err)
    }
    return {
      aiImage: data.drawing,
      score: parseFloat((Math.random() * 3 + 7).toFixed(1)),
      feedback: ''
    }
  }

  const fallbackJudge = (r1, r2) => {
    if (r1.score > r2.score) return { winner: 'p1', feedback: `${config.p1Name} wins with a higher score!` }
    if (r2.score > r1.score) return { winner: 'p2', feedback: `${config.p2Name} wins with a higher score!` }
    return { winner: 'tie', feedback: "It's a perfect tie! Both designs are amazing!" }
  }

  const processAndJudge = async () => {
    setPhase('processing')

    const [result1, result2] = await Promise.all([
      processDrawing(p1Data),
      processDrawing(p2Data)
    ])

    setP1Result(result1)
    setP2Result(result2)
    setPhase('judging')

    let winnerResult, verdictResult

    try {
      const judgeRes = await fetch('/api/ai/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image1: result1.aiImage,
          image2: result2.aiImage,
          theme: config.theme,
          p1Name: config.p1Name,
          p2Name: config.p2Name
        })
      })

      if (judgeRes.ok) {
        const judgeData = await judgeRes.json()
        winnerResult = judgeData.winner
        verdictResult = judgeData.feedback
      } else {
        const fb = fallbackJudge(result1, result2)
        winnerResult = fb.winner
        verdictResult = fb.feedback
      }
    } catch {
      const fb = fallbackJudge(result1, result2)
      winnerResult = fb.winner
      verdictResult = fb.feedback
    }

    setWinner(winnerResult)
    setVerdict(verdictResult)

    // Save to gallery
    try {
      const [thumbP1Draw, thumbP1Ai, thumbP2Draw, thumbP2Ai] = await Promise.all([
        resizeImage(p1Data.drawing),
        resizeImage(result1.aiImage || p1Data.drawing),
        resizeImage(p2Data.drawing),
        resizeImage(result2.aiImage || p2Data.drawing)
      ])

      const gallery = JSON.parse(localStorage.getItem('prettyEnglishGallery') || '[]')
      gallery.push({
        id: Date.now(),
        versus: true,
        theme: config.theme,
        p1Name: config.p1Name,
        p2Name: config.p2Name,
        p1Drawing: thumbP1Draw,
        p2Drawing: thumbP2Draw,
        p1AiImage: thumbP1Ai,
        p2AiImage: thumbP2Ai,
        p1Score: result1.score,
        p2Score: result2.score,
        winner: winnerResult,
        feedback: verdictResult,
        date: new Date().toISOString()
      })
      while (gallery.length > 30) gallery.shift()
      localStorage.setItem('prettyEnglishGallery', JSON.stringify(gallery))
    } catch (err) {
      console.log('Gallery save error:', err)
    }

    setPhase('done')
  }

  const getWinnerName = () => {
    if (winner === 'p1') return config.p1Name
    if (winner === 'p2') return config.p2Name
    return null
  }

  return (
    <div className="versus-results">
      {phase !== 'done' ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <h2 className="bubble-text loading-title">
            {phase === 'processing' ? '✨ Creating AI Magic...' : '⚖️ Judging...'}
          </h2>
          <p className="loading-sub">
            {phase === 'processing'
              ? 'Transforming both designs!'
              : 'The AI is picking a winner...'}
          </p>
        </div>
      ) : (
        <div className="versus-results-content">
          <h2 className="bubble-text versus-results-heading">⚔️ Battle Results!</h2>
          <h3 className="versus-results-theme">{config.theme}</h3>

          <div className="versus-results-cards">
            <div className={`versus-result-card ${winner === 'p1' ? 'winner-card' : ''}`}>
              {winner === 'p1' && <div className="winner-crown">🏆</div>}
              <h4 className="versus-player-name">{config.p1Name}</h4>
              <img
                src={p1Result?.aiImage || p1Data.drawing}
                alt={config.p1Name}
                className="versus-result-img"
                onClick={() => setLightbox(p1Result?.aiImage || p1Data.drawing)}
              />
              <span className="versus-player-score">{p1Result?.score?.toFixed(1)}/10</span>
            </div>

            <div className="versus-results-middle">
              <span className="versus-results-vs">VS</span>
            </div>

            <div className={`versus-result-card ${winner === 'p2' ? 'winner-card' : ''}`}>
              {winner === 'p2' && <div className="winner-crown">🏆</div>}
              <h4 className="versus-player-name">{config.p2Name}</h4>
              <img
                src={p2Result?.aiImage || p2Data.drawing}
                alt={config.p2Name}
                className="versus-result-img"
                onClick={() => setLightbox(p2Result?.aiImage || p2Data.drawing)}
              />
              <span className="versus-player-score">{p2Result?.score?.toFixed(1)}/10</span>
            </div>
          </div>

          <div className="versus-verdict-section">
            {winner === 'tie' ? (
              <h3 className="versus-verdict-title">🤝 It's a Tie!</h3>
            ) : (
              <h3 className="versus-verdict-title">🏆 {getWinnerName()} Wins!</h3>
            )}
            {verdict && <p className="versus-verdict-text">{verdict}</p>}
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
