import React, { useState, useEffect } from 'react'
import './Results.css'
import { resizeImage } from '../utils/imageUtils'

function Results({ level, resultData, quizScore, onDone, reviewMode, onPlayAgain }) {
  const [aiImage, setAiImage] = useState(null)
  const [score, setScore] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (reviewMode) {
      setAiImage(resultData.aiImage)
      setScore(resultData.score)
      setFeedback(resultData.feedback || '')
      setLoading(false)
    } else {
      processWithAI()
    }
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
        setAiImage(data.generatedImage)
        setScore(data.score)
        setFeedback(data.feedback || '')
        setLoading(false)
        saveResults(data.generatedImage, data.score, data.feedback || '')
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
      const simScore = parseFloat(simulated)
      setScore(simScore)
      setLoading(false)
      saveResults(resultData.drawing, simScore, '')
    }, 2500)
  }

  const saveResults = async (aiImg, sc, fb) => {
    // Save level result for review
    try {
      const levelResults = JSON.parse(localStorage.getItem('prettyEnglishLevelResults') || '{}')
      levelResults[level] = {
        drawing: resultData.drawing,
        aiImage: aiImg,
        score: sc,
        feedback: fb,
        theme: resultData.theme,
        mannequin: resultData.mannequin,
        outfitItems: resultData.outfitItems,
        date: new Date().toISOString()
      }
      localStorage.setItem('prettyEnglishLevelResults', JSON.stringify(levelResults))
    } catch (err) {
      console.log('Level result save error:', err)
    }

    // Save to gallery (thumbnails)
    try {
      const thumbDraw = await resizeImage(resultData.drawing)
      const thumbAi = await resizeImage(aiImg || resultData.drawing)
      const gallery = JSON.parse(localStorage.getItem('prettyEnglishGallery') || '[]')
      gallery.push({
        id: Date.now(),
        versus: false,
        theme: resultData.theme,
        drawing: thumbDraw,
        aiImage: thumbAi,
        score: sc,
        feedback: fb,
        levelId: level,
        date: new Date().toISOString()
      })
      while (gallery.length > 30) gallery.shift()
      localStorage.setItem('prettyEnglishGallery', JSON.stringify(gallery))
    } catch (err) {
      console.log('Gallery save error:', err)
    }
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
          <div className="results-header-row">
            <h2 className="bubble-text results-heading">{reviewMode ? 'Previous Design' : 'Results!'}</h2>
            {reviewMode ? (
              <>
                <button className="results-continue" onClick={onPlayAgain}>▶ Play Again</button>
                <button className="results-continue" onClick={() => onDone(0)}>← Back</button>
              </>
            ) : (
              <button className="results-continue" onClick={() => onDone(isPerfect ? 4 : stars)}>
                Continue →
              </button>
            )}
          </div>

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
