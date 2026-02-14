import React, { useState } from 'react'
import './Auth.css'

function Auth({ user, onLogin, onLogout, onClose }) {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await response.json()
      if (data.success) {
        setMessage(isLogin ? '!התחברת בהצלחה 🎉' : '!נרשמת בהצלחה 🎉')
        onLogin(data.user)
        setTimeout(onClose, 1500)
      } else {
        setMessage(data.message || 'שגיאה, נסי שוב')
      }
    } catch {
      setMessage('🔧 Server not connected yet — coming soon!')
    }
  }

  const handleLogout = () => {
    onLogout()
    onClose()
  }

  // If already logged in, show profile
  if (user) {
    return (
      <div className="auth-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={e => e.stopPropagation()}>
          <button className="auth-close" onClick={onClose}>✕</button>
          <div className="auth-profile">
            <div className="auth-avatar">👤</div>
            <h2 className="bubble-text auth-title">!שלום</h2>
            <p className="auth-username">{user.username}</p>
            <button className="auth-logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>✕</button>

        <h2 className="bubble-text auth-title">
          {isLogin ? 'Login' : 'Register'}
        </h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
          />
          <button type="submit" className="auth-submit">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <button
          className="auth-toggle"
          onClick={() => { setIsLogin(!isLogin); setMessage('') }}
        >
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </button>
      </div>
    </div>
  )
}

export default Auth
