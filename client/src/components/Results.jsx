import React, { useState, useEffect } from 'react'
import './Results.css'

function Results({ level, resultData, quizScore, onDone }) {
  const [aiImage, setAiImage] = useState(null)
  const [score, setScore] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    processWithAI()
  }, [])

  const processWithAI = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawing: resultData.drawing,
          theme: resultData.theme,
          mannequin: resultData.mannequin,
          outfitItems: resultData.outfitItems || []
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('AI response received, image length:', data.generatedImage?.length)
        console.log('Image starts with:', data.generatedImage?.substring(0, 50))
        console.log('Score:', data.score, 'Feedback:', data.feedback)
        setAiImage(data.generatedImage)
        setScore(data.score)
        setFeedback(data.feedback || '')
        setLoading(false)
      } else {
        console.error('AI response not ok:', response.status)
        simulateResults()
      }
    } catch (err) {
      console.error('AI fetch error:', err)
      simulateResults()
    }
  }

  const simulateResults = () => {
    // Development fallback — simulate AI
    setTimeout(() => {
      setAiImage(resultData.drawing)
      const simulated = (Math.random() * 3 + 7).toFixed(1)
      setScore(parseFloat(simulated))
      setLoading(false)
    }, 2500)
  }

  const getStars = (s) => {
    if (!s) return 0
    if (s >= 9.5) return 4
    if (s >= 9) return 3
    if (s >= 8) return 2
    if (s >= 7) return 1
    return 0
  }

  const stars = getStars(score)
  const isPerfect = stars === 4

  const getLabel = () => {
    if (isPerfect) return '💎 PERFECT!'
    if (stars === 3) return '⭐⭐⭐ Amazing!'
    if (stars === 2) return '⭐⭐ Great job!'
    if (stars === 1) return '⭐ Good start!'
    return 'Try again!'
  }

  return (
    <div className="results">
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <h2 className="bubble-text loading-title">✨ Making Magic...</h2>
          <p className="loading-sub">The AI is transforming your design!</p>
        </div>
      ) : (
        <div className="results-content">
          <h2 className="bubble-text results-heading">Results!</h2>

          <div className="results-images">
            <div className="result-card" onClick={() => setLightbox(resultData.drawing)}>
              <h3 className="card-label">Your Design ✏️</h3>
              <img src={resultData.drawing} alt="Your drawing" className="result-img" />
            </div>

            <div className="results-arrow-icon">→</div>

            <div className="result-card" onClick={() => setLightbox(aiImage || resultData.drawing)}>
              <h3 className="card-label">AI Version ✨</h3>
              <img 
                src={aiImage || resultData.drawing} 
                alt="AI generated" 
                className="result-img"
                onLoad={() => console.log('AI IMAGE LOADED OK in DOM')}
                onError={(e) => console.error('AI IMAGE FAILED TO LOAD', e.target.src?.substring(0, 80))}
              />
            </div>
          </div>

          <div className="score-row">
            <span className="score-big">{score?.toFixed(1)}</span>
            <span className="score-of">/ 10</span>
          </div>

          <div className="stars-row">
            {isPerfect ? (
              <span className="perfect-gem">💎</span>
            ) : (
              [1, 2, 3].map(i => (
                <span key={i} className={`result-star ${i <= stars ? 'filled' : 'empty'}`}>
                  ★
                </span>
              ))
            )}
          </div>

          <div className="score-verdict">{getLabel()}</div>

          {feedback && <p className="ai-feedback">{feedback}</p>}

          <button className="results-continue" onClick={() => onDone(isPerfect ? 4 : stars)}>
            Continue →
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

export default Results
