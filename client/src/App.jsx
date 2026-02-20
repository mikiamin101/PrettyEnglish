import React, { useState, useEffect, useCallback } from 'react'
import Landing from './components/Landing'
import LevelSelect from './components/LevelSelect'
import Quiz from './components/Quiz'
import DrawingCanvas from './components/DrawingCanvas'
import Results from './components/Results'
import Auth from './components/Auth'
import Gallery from './components/Gallery'
import Versus from './components/Versus'
import VersusResults from './components/VersusResults'
import socket from './utils/socket'
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
  // Online 1v1 state
  const [versusInfo, setVersusInfo] = useState(null) // { theme, timerSeconds, hostName, guestName }
  const [versusWaiting, setVersusWaiting] = useState(false) // waiting for opponent to submit

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

  // ── Socket lifecycle for versus mode ──
  const enterVersusMode = useCallback(() => {
    if (!socket.connected) socket.connect()
    setScreen('versus')
  }, [])

  const exitVersusMode = useCallback(() => {
    socket.emit('leaveRoom')
    socket.disconnect()
    setVersusInfo(null)
    setVersusWaiting(false)
    setScreen('landing')
  }, [])

  // Listen for opponent-submitted while drawing
  useEffect(() => {
    const onOpponentSubmitted = () => setVersusWaiting(false) // just a notification
    socket.on('opponentSubmitted', onOpponentSubmitted)
    return () => socket.off('opponentSubmitted', onOpponentSubmitted)
  }, [])

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
      setCurrentLevel(levelId)
      setScreen('quiz')
    }
  }

  const handlePlayAgain = () => {
    setReviewMode(false)
    setScreen('quiz')
  }

  // ── Online 1v1 handlers ──
  const handleVersusStartDrawing = useCallback((info) => {
    // info = { hostName, guestName, theme, timerSeconds }
    setVersusInfo(info)
    setVersusWaiting(false)
    setScreen('versusDrawing')
  }, [])

  const handleVersusDrawingComplete = useCallback((data) => {
    // Send drawing to server via socket
    socket.emit('submitDrawing', {
      drawing: data.drawing,
      mannequin: data.mannequin,
      theme: data.theme,
      outfitItems: data.outfitItems || []
    })
    setVersusWaiting(true)
    setScreen('versusResults')
  }, [])

  const handleVersusDone = useCallback(() => {
    socket.emit('leaveRoom')
    socket.disconnect()
    setVersusInfo(null)
    setVersusWaiting(false)
    setScreen('landing')
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('prettyEnglishUser', JSON.stringify(userData))
    fetchAndMergeProgress(userData.id)
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
          onVersus={enterVersusMode}
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
        <Versus
          socket={socket}
          onStartDrawing={handleVersusStartDrawing}
          onBack={exitVersusMode}
        />
      )}

      {screen === 'versusDrawing' && versusInfo && (
        <DrawingCanvas
          onComplete={handleVersusDrawingComplete}
          onBack={exitVersusMode}
          customTheme={versusInfo.theme}
          timerSeconds={versusInfo.timerSeconds}
          playerLabel="🎨 Draw your design!"
        />
      )}

      {screen === 'versusResults' && (
        <VersusResults
          socket={socket}
          onDone={handleVersusDone}
        />
      )}
    </div>
  )
}

export default App
