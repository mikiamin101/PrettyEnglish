import { Router } from 'express'
import pg from 'pg'
import bcrypt from 'bcrypt'

const router = Router()

const getPool = () => {
  if (process.env.DATABASE_URL) {
    return new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  }
  return null
}

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body
    const pool = getPool()

    if (!pool) {
      return res.json({ success: false, message: 'Database not configured yet' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    )

    res.json({ success: true, user: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') {
      res.json({ success: false, message: 'Username already exists' })
    } else {
      console.error('Register error:', err)
      res.status(500).json({ success: false, message: 'Server error' })
    }
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const pool = getPool()

    if (!pool) {
      return res.json({ success: false, message: 'Database not configured yet' })
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    )

    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'User not found' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return res.json({ success: false, message: 'Wrong password' })
    }

    res.json({ success: true, user: { id: user.id, username: user.username } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

export default router
