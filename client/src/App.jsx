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

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('prettyEnglishProgress', JSON.stringify(progress))
  }, [progress])

  // Fetch server progress and merge with local
  const fetchAndMergeProgress = async (userId) => {
    try {
      const res = await fetch(`/api/levels/progress/${userId}`)
      const data = await res.json()
      if (data.progress) {
        setProgress(prev => {
          const merged = { ...prev }
          Object.entries(data.progress).forEach(([lvl, stars]) => {
            merged[lvl] = Math.max(merged[lvl] || 0, stars)
          })
          return merged
        })
      }
    } catch (err) {
      console.log('Could not fetch server progress:', err)
    }
  }

  // Save a single level's progress to server
  const saveProgressToServer = async (userId, levelId, stars) => {
    try {
      await fetch('/api/levels/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, levelId, stars })
      })
    } catch (err) {
      console.log('Could not save progress to server:', err)
    }
  }

  // On app load, sync from server if logged in
  useEffect(() => {
    if (user?.id) {
      fetchAndMergeProgress(user.id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      // Sync to server if logged in
      if (user?.id) {
        saveProgressToServer(user.id, currentLevel, stars)
      }
    }
    setScreen('levelSelect')
  }

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('prettyEnglishUser', JSON.stringify(userData))
    // Fetch server progress and merge with local
    fetchAndMergeProgress(userData.id)
    // Also push any local progress to server
    Object.entries(progress).forEach(([lvl, stars]) => {
      if (stars > 0) saveProgressToServer(userData.id, Number(lvl), stars)
    })
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
