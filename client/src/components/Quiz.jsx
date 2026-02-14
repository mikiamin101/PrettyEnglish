import React, { useState, useEffect, useRef } from 'react'
import './Quiz.css'
import { levels } from '../data/levels'
import { checkTranslation } from '../utils/fuzzyMatch'

function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const PASS_THRESHOLD = 14

function Quiz({ level, onComplete, onBack }) {
  const levelData = levels.find(l => l.id === level)
  const [words, setWords] = useState(() => shuffleArray(levelData?.words || []))
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [showNext, setShowNext] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [wrongWords, setWrongWords] = useState([])
  const inputRef = useRef(null)

  const currentWord = words[currentWordIndex]

  useEffect(() => {
    if (inputRef.current && !showNext) {
      inputRef.current.focus()
    }
  }, [currentWordIndex, showNext])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!answer.trim() || showNext) return

    const isCorrect = checkTranslation(answer.trim(), currentWord.translations)

    if (isCorrect) {
      setScore(prev => prev + 1)
      setFeedback({ correct: true, message: '!נכון ✅' })
    } else {
      setFeedback({
        correct: false,
        message: `${currentWord.translations[0]} :התשובה הנכונה`
      })
      setWrongWords(prev => [...prev, currentWord])
    }
    setShowNext(true)
  }

  const handleNext = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(prev => prev + 1)
      setAnswer('')
      setFeedback(null)
      setShowNext(false)
    } else {
      setCompleted(true)
    }
  }

  const handleRetry = () => {
    setWords(shuffleArray(levelData?.words || []))
    setCurrentWordIndex(0)
    setAnswer('')
    setScore(0)
    setFeedback(null)
    setShowNext(false)
    setCompleted(false)
    setWrongWords([])
  }

  const passed = score >= PASS_THRESHOLD

  if (completed) {
    return (
      <div className="quiz">
        <div className="quiz-complete">
          <h2 className="bubble-text quiz-complete-title">
            {passed ? '!כל הכבוד 🎉' : '!נסי שוב 💪'}
          </h2>
          <div className="quiz-final-score">
            <span className={`score-number ${passed ? 'passed' : 'failed'}`}>{score}</span>
            <span className="score-total">/ {words.length}</span>
          </div>

          {passed ? (
            <>
              <p className="quiz-message hebrew-text">!מעולה! עכשיו בואי נצייר 🎨</p>
              <button className="quiz-action-btn pass-btn" onClick={() => onComplete(score)}>
                🎨 בואי נצייר!
              </button>
            </>
          ) : (
            <>
              <p className="quiz-message hebrew-text">
                צריך לפחות {PASS_THRESHOLD} תשובות נכונות כדי להמשיך
              </p>
              {wrongWords.length > 0 && (
                <div className="wrong-words-list">
                  <h3 className="wrong-words-title hebrew-text">:מילים לחזור עליהן 📝</h3>
                  {wrongWords.map((w, i) => (
                    <div key={i} className="wrong-word-item">
                      <span className="wrong-english">{w.english}</span>
                      <span className="wrong-arrow">→</span>
                      <span className="wrong-hebrew hebrew-text">{w.translations[0]}</span>
                    </div>
                  ))}
                </div>
              )}
              <button className="quiz-action-btn retry-btn" onClick={handleRetry}>
                🔄 נסי שוב
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="quiz">
      <button className="back-btn quiz-back" onClick={onBack}>← Back</button>

      <div className="quiz-header">
        <h2 className="bubble-text quiz-title-text">Level {level} - Quiz</h2>
        <div className="quiz-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentWordIndex) / words.length) * 100}%` }}
            />
          </div>
          <span className="progress-text">{currentWordIndex + 1} / {words.length}</span>
        </div>
        <div className="quiz-score-display">✓ {score}</div>
      </div>

      <div className="quiz-card">
        <div className="word-display">
          <span className="word-label hebrew-text">:תרגמי לעברית</span>
          <span className="word-english">{currentWord?.english}</span>
          {currentWord?.hint && (
            <span className="word-hint">💡 {currentWord.hint}</span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="answer-form">
          <input
            ref={inputRef}
            type="text"
            className="answer-input hebrew-text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
            placeholder="...הקלידי את התרגום"
            dir="rtl"
            disabled={showNext}
            autoComplete="off"
          />
          {!showNext && (
            <button type="submit" className="submit-btn">✓ בדקי</button>
          )}
        </form>

        {feedback && (
          <div className={`feedback ${feedback.correct ? 'correct' : 'incorrect'}`}>
            <span className="hebrew-text">{feedback.message}</span>
          </div>
        )}

        {showNext && (
          <button className="next-btn" onClick={handleNext}>
            {currentWordIndex < words.length - 1 ? '→ הבא' : '→ סיום'}
          </button>
        )}
      </div>
    </div>
  )
}

export default Quiz
