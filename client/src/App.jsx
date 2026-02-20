import React, { useState, useEffect } from 'react'
import Landing from './components/Landing'
import LevelSelect from './components/LevelSelect'
import Quiz from './components/Quiz'
import DrawingCanvas from './components/DrawingCanvas'
import Results from './components/Results'
import Auth from './components/Auth'
import Gallery from './components/Gallery'
import Versus from './components/Versus'
import VersusResults from './components/VersusResults'
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
  const [reviewMode, setReviewMode] = useState(false)
  const [versusConfig, setVersusConfig] = useState(null)
  const [versusP1Data, setVersusP1Data] = useState(null)
  const [versusP2Data, setVersusP2Data] = useState(null)

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
    if (stars > 0 && !reviewMode) {
      setProgress(prev => ({
        ...prev,
        [currentLevel]: Math.max(prev[currentLevel] || 0, stars)
      }))
      if (user?.id) {
        saveProgressToServer(user.id, currentLevel, stars)
      }
    }
    setReviewMode(false)
    setScreen('levelSelect')
  }

  const handleViewResult = (levelId) => {
    const levelResults = JSON.parse(localStorage.getItem('prettyEnglishLevelResults') || '{}')
    const saved = levelResults[levelId]
    if (saved) {
      setCurrentLevel(levelId)
      setResultData(saved)
      setReviewMode(true)
      setScreen('results')
    } else {
      // No saved result, just replay
      setCurrentLevel(levelId)
      setScreen('quiz')
    }
  }

  const handlePlayAgain = () => {
    setReviewMode(false)
    setScreen('quiz')
  }

  // ── 1v1 handlers ──
  const handleVersusStart = (config) => {
    setVersusConfig(config)
    setVersusP1Data(null)
    setVersusP2Data(null)
    setScreen('versusDrawP1')
  }

  const handleVersusP1Complete = (data) => {
    setVersusP1Data(data)
    setScreen('versusDrawP2')
  }

  const handleVersusP2Complete = (data) => {
    setVersusP2Data(data)
    setScreen('versusResults')
  }

  const handleVersusDone = () => {
    setVersusConfig(null)
    setVersusP1Data(null)
    setVersusP2Data(null)
    setScreen('landing')
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
          onGallery={() => setScreen('gallery')}
          onVersus={() => setScreen('versus')}
        />
      )}

      {screen === 'levelSelect' && (
        <LevelSelect
          progress={progress}
          onSelectLevel={handleSelectLevel}
          onBack={handleBackToLanding}
          onViewResult={handleViewResult}
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
          reviewMode={reviewMode}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {screen === 'gallery' && (
        <Gallery onBack={handleBackToLanding} />
      )}

      {screen === 'versus' && (
        <Versus onStart={handleVersusStart} onBack={handleBackToLanding} />
      )}

      {screen === 'versusDrawP1' && versusConfig && (
        <DrawingCanvas
          onComplete={handleVersusP1Complete}
          onBack={() => setScreen('versus')}
          customTheme={versusConfig.theme}
          timerSeconds={versusConfig.timerSeconds}
          playerLabel={`👩‍🎨 ${versusConfig.p1Name}'s Turn`}
        />
      )}

      {screen === 'versusDrawP2' && versusConfig && (
        <DrawingCanvas
          onComplete={handleVersusP2Complete}
          onBack={() => setScreen('versus')}
          customTheme={versusConfig.theme}
          timerSeconds={versusConfig.timerSeconds}
          playerLabel={`🎨 ${versusConfig.p2Name}'s Turn`}
        />
      )}

      {screen === 'versusResults' && versusConfig && versusP1Data && versusP2Data && (
        <VersusResults
          config={versusConfig}
          p1Data={versusP1Data}
          p2Data={versusP2Data}
          onDone={handleVersusDone}
        />
      )}
    </div>
  )
}

export default App
