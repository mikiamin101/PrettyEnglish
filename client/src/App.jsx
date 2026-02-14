import React, { useState, useEffect } from 'react'
import Landing from './components/Landing'
import LevelSelect from './components/LevelSelect'
import Quiz from './components/Quiz'
import DrawingCanvas from './components/DrawingCanvas'
import Results from './components/Results'
import Auth from './components/Auth'
import './App.css'

function App() {
  const [screen, setScreen] = useState('landing')
  const [currentLevel, setCurrentLevel] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('prettyEnglishUser')
    return saved ? JSON.parse(saved) : null
  })
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('prettyEnglishProgress')
    return saved ? JSON.parse(saved) : {}
  })
  const [quizScore, setQuizScore] = useState(0)
  const [resultData, setResultData] = useState(null)

  useEffect(() => {
    localStorage.setItem('prettyEnglishProgress', JSON.stringify(progress))
  }, [progress])

  const handleChooseLevel = () => setScreen('levelSelect')

  const handleSelectLevel = (level) => {
    setCurrentLevel(level)
    setScreen('quiz')
  }

  const handleQuizComplete = (score) => {
    setQuizScore(score)
    setScreen('drawing')
  }

  const handleDrawingComplete = (data) => {
    setResultData(data)
    setScreen('results')
  }

  const handleResultsDone = (stars) => {
    if (stars > 0) {
      setProgress(prev => ({
        ...prev,
        [currentLevel]: Math.max(prev[currentLevel] || 0, stars)
      }))
    }
    setScreen('levelSelect')
  }

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('prettyEnglishUser', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('prettyEnglishUser')
  }

  const handleBackToLanding = () => setScreen('landing')

  return (
    <div className="app">
      {showAuth && <Auth user={user} onLogin={handleLogin} onLogout={handleLogout} onClose={() => setShowAuth(false)} />}

      {screen === 'landing' && (
        <Landing
          user={user}
          onChooseLevel={handleChooseLevel}
          onShowAuth={() => setShowAuth(true)}
        />
      )}

      {screen === 'levelSelect' && (
        <LevelSelect
          progress={progress}
          onSelectLevel={handleSelectLevel}
          onBack={handleBackToLanding}
        />
      )}

      {screen === 'quiz' && (
        <Quiz
          level={currentLevel}
          onComplete={handleQuizComplete}
          onBack={() => setScreen('levelSelect')}
        />
      )}

      {screen === 'drawing' && (
        <DrawingCanvas
          level={currentLevel}
          onComplete={handleDrawingComplete}
          onBack={() => setScreen('levelSelect')}
        />
      )}

      {screen === 'results' && (
        <Results
          level={currentLevel}
          resultData={resultData}
          quizScore={quizScore}
          onDone={handleResultsDone}
        />
      )}
    </div>
  )
}

export default App
