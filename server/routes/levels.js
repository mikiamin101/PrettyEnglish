import { Router } from 'express'
import pg from 'pg'

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

router.get('/progress/:userId', async (req, res) => {
  try {
    const pool = getPool()
    if (!pool) {
      return res.json({ progress: {} })
    }

    const result = await pool.query(
      'SELECT level_id, stars FROM level_progress WHERE user_id = $1',
      [req.params.userId]
    )

    const progress = {}
    result.rows.forEach(row => {
      progress[row.level_id] = row.stars
    })

    res.json({ progress })
  } catch (err) {
    console.error('Progress fetch error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/progress', async (req, res) => {
  try {
    const { userId, levelId, stars } = req.body
    const pool = getPool()

    if (!pool) {
      return res.json({ success: true, message: 'Saved locally' })
    }

    await pool.query(`
      INSERT INTO level_progress (user_id, level_id, stars)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, level_id)
      DO UPDATE SET stars = GREATEST(level_progress.stars, $3),
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, levelId, stars])

    res.json({ success: true })
  } catch (err) {
    console.error('Progress save error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
