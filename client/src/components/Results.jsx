import React, { useState, useEffect } from 'react'
import './Results.css'

function Results({ level, resultData, quizScore, onDone }) {
  const [aiImage, setAiImage] = useState(null)
  const [score, setScore] = useState(null)
  const [loading, setLoading] = useState(true)

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
          mannequin: resultData.mannequin
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiImage(data.generatedImage)
        setScore(data.score)
        setLoading(false)
      } else {
        simulateResults()
      }
    } catch {
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
            <div className="result-card">
              <h3 className="card-label">Your Design ✏️</h3>
              <img src={resultData.drawing} alt="Your drawing" className="result-img" />
            </div>

            <div className="results-arrow-icon">→</div>

            <div className="result-card">
              <h3 className="card-label">AI Version ✨</h3>
              <img src={aiImage || resultData.drawing} alt="AI generated" className="result-img" />
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

          <button className="results-continue" onClick={() => onDone(isPerfect ? 4 : stars)}>
            Continue →
          </button>
        </div>
      )}
    </div>
  )
}

export default Results
