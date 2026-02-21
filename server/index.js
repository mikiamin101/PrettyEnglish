import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { Server } from 'socket.io'
import authRoutes from './routes/auth.js'
import levelRoutes from './routes/levels.js'
import aiRoutes from './routes/ai.js'
import { fashionThemes } from './data/fashionThemes.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' },
  maxHttpBufferSize: 50e6 // 50MB for image data
})
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/levels', levelRoutes)
app.use('/api/ai', aiRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pretty English server is running! 🎨' })
})

// ══════════════════════════════════════════════
// Socket.IO — 1v1 Online Room Management
// ══════════════════════════════════════════════
const rooms = new Map() // roomCode -> { host, guest, theme, timerSeconds, themeMode, selectedTheme, submissions, usedThemes, disconnectTimers, cachedResults }

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function pickTheme(room) {
  if (room.themeMode === 'choose' && room.selectedTheme) {
    return room.selectedTheme
  }
  // Random — avoid repeats in this room
  const available = fashionThemes.filter((_, i) => !room.usedThemes.includes(i))
  let theme
  if (available.length === 0) {
    room.usedThemes = []
    theme = fashionThemes[Math.floor(Math.random() * fashionThemes.length)]
  } else {
    theme = available[Math.floor(Math.random() * available.length)]
  }
  const idx = fashionThemes.indexOf(theme)
  if (idx >= 0) room.usedThemes.push(idx)
  return theme
}

async function processDrawing(data) {
  try {
    const itemsList = (data.outfitItems || []).join(', ')
    let generatedImage = data.drawing
    let score = parseFloat((Math.random() * 3 + 7).toFixed(1))
    let feedback = 'Great design! Keep experimenting!'

    if (!process.env.OPENAI_API_KEY) {
      return { aiImage: generatedImage, score, feedback }
    }

    // Image generation
    try {
      const base64Data = data.drawing.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const formData = new FormData()
      const imageBlob = new Blob([imageBuffer], { type: 'image/png' })
      formData.append('image[]', imageBlob, 'drawing.png')
      formData.append('model', 'gpt-image-1.5')
      formData.append('prompt', `Turn this fashion sketch drawing into a photorealistic photograph of a fashion model on a runway catwalk, facing the camera, full body shot. The outfit consists of: ${itemsList}. Preserve the exact outfit design, colors, patterns, and style from the sketch. Theme: ${data.theme}. Natural studio lighting, fashion week photography, realistic fabric textures and draping. Do not add new clothing elements beyond what is listed. No text, no watermarks.`)
      formData.append('n', '1')
      formData.append('size', '1024x1024')
      formData.append('quality', 'low')

      const editResponse = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData
      })

      if (editResponse.ok) {
        const editData = await editResponse.json()
        const item = editData.data?.[0]
        if (item?.b64_json) {
          generatedImage = `data:image/png;base64,${item.b64_json}`
        } else if (item?.url) {
          const imgResponse = await fetch(item.url)
          if (imgResponse.ok) {
            const imgArrayBuffer = await imgResponse.arrayBuffer()
            const imgBase64 = Buffer.from(imgArrayBuffer).toString('base64')
            generatedImage = `data:image/png;base64,${imgBase64}`
          }
        }
      }
    } catch (err) {
      console.error('Image generation error:', err.message)
    }

    // Scoring
    try {
      const scoreResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a fashion judge. Rate the outfit 1-10 for theme "${data.theme}". Respond with ONLY JSON: {"score": <number>, "feedback": "<1-2 sentences>"}`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Rate this ${data.theme} outfit:` },
                { type: 'image_url', image_url: { url: generatedImage } }
              ]
            }
          ],
          max_tokens: 200
        })
      })

      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json()
        const content = scoreData.choices[0].message.content
        try {
          const parsed = JSON.parse(content)
          score = parsed.score
          feedback = parsed.feedback || feedback
        } catch {
          const match = content.match(/\d+\.?\d*/)
          if (match) score = parseFloat(match[0])
        }
      }
    } catch (err) {
      console.error('Scoring error:', err.message)
    }

    return { aiImage: generatedImage, score, feedback }
  } catch (err) {
    console.error('processDrawing error:', err)
    return { aiImage: data.drawing, score: 7, feedback: 'Nice design!' }
  }
}

async function judgeWinner(image1, image2, theme, p1Name, p2Name) {
  let winner = Math.random() > 0.5 ? 'host' : 'guest'
  let feedback = `${winner === 'host' ? p1Name : p2Name} wins this round!`

  if (!process.env.OPENAI_API_KEY) {
    return { winner, feedback }
  }

  try {
    const judgeResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a fun fashion judge comparing two outfits for the theme "${theme}". Compare ${p1Name}'s design (Image 1) and ${p2Name}'s design (Image 2). Pick a winner or declare a tie.\n\nRespond with ONLY JSON: {"winner": "p1" or "p2" or "tie", "feedback": "<fun 1-2 sentence verdict>"}`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Compare these two ${theme} outfits. Image 1 is ${p1Name}, Image 2 is ${p2Name}. Who wins?` },
              { type: 'image_url', image_url: { url: image1 } },
              { type: 'image_url', image_url: { url: image2 } }
            ]
          }
        ],
        max_tokens: 200
      })
    })

    if (judgeResponse.ok) {
      const judgeData = await judgeResponse.json()
      const content = judgeData.choices[0].message.content
      try {
        const parsed = JSON.parse(content)
        // Map p1/p2 to host/guest
        winner = parsed.winner === 'p1' ? 'host' : parsed.winner === 'p2' ? 'guest' : 'tie'
        feedback = parsed.feedback || feedback
      } catch {}
    }
  } catch (err) {
    console.error('Judge AI error:', err.message)
  }

  return { winner, feedback }
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id)

  // ── Create room ──
  socket.on('createRoom', ({ playerName, useTimer, timerMinutes, themeMode, selectedTheme }) => {
    let code
    do { code = generateRoomCode() } while (rooms.has(code))

    rooms.set(code, {
      host: { id: socket.id, name: playerName, ready: false },
      guest: null,
      theme: null,
      timerSeconds: useTimer ? timerMinutes * 60 : null,
      themeMode: themeMode || 'random',
      selectedTheme: selectedTheme || null,
      submissions: {},
      usedThemes: [],
      processing: false,
      disconnectTimers: {},
      cachedResults: null
    })

    socket.join(code)
    socket.roomCode = code
    socket.playerRole = 'host'
    socket.emit('roomCreated', { code })
    console.log(`Room ${code} created by ${playerName}`)
  })

  // ── Join room ──
  socket.on('joinRoom', ({ code, playerName }) => {
    const room = rooms.get(code)
    if (!room) {
      socket.emit('error', { message: 'Room not found! Check the code.' })
      return
    }
    if (room.guest) {
      socket.emit('error', { message: 'Room is full!' })
      return
    }

    room.guest = { id: socket.id, name: playerName, ready: false }
    socket.join(code)
    socket.roomCode = code
    socket.playerRole = 'guest'

    // Pick theme now that both are here
    room.theme = pickTheme(room)

    // Notify both players
    io.to(code).emit('roomReady', {
      hostName: room.host.name,
      guestName: room.guest.name,
      theme: room.theme,
      timerSeconds: room.timerSeconds
    })
    console.log(`${playerName} joined room ${code}`)
  })

  // ── Player submits drawing ──
  socket.on('submitDrawing', (data) => {
    const code = socket.roomCode
    const role = socket.playerRole
    const room = rooms.get(code)
    if (!room || !role) return

    room.submissions[role] = data
    console.log(`${role} submitted drawing in room ${code}`)

    // Notify opponent that this player finished
    socket.to(code).emit('opponentSubmitted')

    // If both submitted, start AI processing
    if (room.submissions.host && room.submissions.guest && !room.processing) {
      room.processing = true
      io.to(code).emit('processingStarted')
      processRoom(code)
    }
  })

  // ── Rejoin room after reconnect ──
  socket.on('rejoinRoom', ({ code, role, playerName }) => {
    const room = rooms.get(code)
    if (!room) {
      socket.emit('error', { message: 'Room expired. Start a new battle.' })
      socket.emit('roomExpired')
      return
    }

    // Clear any pending disconnect timer for this role
    if (room.disconnectTimers[role]) {
      clearTimeout(room.disconnectTimers[role])
      delete room.disconnectTimers[role]
      console.log(`Cleared disconnect timer for ${role} in room ${code}`)
    }

    // Reclaim the seat
    if (role === 'host' && room.host) {
      room.host.id = socket.id
    } else if (role === 'guest' && room.guest) {
      room.guest.id = socket.id
    } else {
      socket.emit('error', { message: 'Could not rejoin — seat taken.' })
      socket.emit('roomExpired')
      return
    }

    socket.join(code)
    socket.roomCode = code
    socket.playerRole = role
    socket.emit('rejoinedRoom', { code, role })
    socket.to(code).emit('opponentReconnected')
    console.log(`${playerName} (${role}) rejoined room ${code}`)

    // If results are already cached, send them immediately
    if (room.cachedResults) {
      socket.emit('versusResults', room.cachedResults)
      return
    }

    // If processing is underway, let them know
    if (room.processing) {
      socket.emit('processingStarted')
    }
  })

  // ── Disconnect — grace period before cleanup ──
  socket.on('disconnect', () => {
    const code = socket.roomCode
    const role = socket.playerRole
    if (code && role) {
      const room = rooms.get(code)
      if (room) {
        // Notify the other player
        socket.to(code).emit('opponentDisconnected')

        // If in lobby (no guest yet), delete immediately
        if (!room.guest) {
          rooms.delete(code)
          console.log(`Room ${code} deleted (host left lobby)`)
        } else {
          // Give 60s grace period for reconnection
          room.disconnectTimers[role] = setTimeout(() => {
            const r = rooms.get(code)
            if (r && !r.cachedResults) {
              // Room still exists and no results yet — kill it
              io.to(code).emit('opponentLeft')
              rooms.delete(code)
              console.log(`Room ${code} deleted (${role} didn't reconnect in 60s)`)
            }
          }, 60000)
          console.log(`${role} disconnected from room ${code}, 60s grace period started`)
        }
      }
    }
    console.log('Socket disconnected:', socket.id)
  })

  // ── Leave room voluntarily (explicit) ──
  socket.on('leaveRoom', () => {
    const code = socket.roomCode
    const role = socket.playerRole
    if (code) {
      const room = rooms.get(code)
      if (room) {
        // Clear any pending timer
        if (role && room.disconnectTimers[role]) {
          clearTimeout(room.disconnectTimers[role])
          delete room.disconnectTimers[role]
        }
        socket.to(code).emit('opponentLeft')
        if (!room.processing && !room.cachedResults) {
          rooms.delete(code)
        }
      }
      socket.leave(code)
      socket.roomCode = null
      socket.playerRole = null
    }
  })
})

async function processRoom(code) {
  const room = rooms.get(code)
  if (!room) return

  try {
    io.to(code).emit('phaseUpdate', { phase: 'processing' })

    // Process both drawings in parallel
    const [hostResult, guestResult] = await Promise.all([
      processDrawing(room.submissions.host),
      processDrawing(room.submissions.guest)
    ])

    io.to(code).emit('phaseUpdate', { phase: 'judging' })

    // Judge
    const judgeResult = await judgeWinner(
      hostResult.aiImage,
      guestResult.aiImage,
      room.theme,
      room.host.name,
      room.guest.name
    )

    // Send results to both players
    const resultsPayload = {
      hostName: room.host.name,
      guestName: room.guest.name,
      theme: room.theme,
      hostResult: {
        drawing: room.submissions.host.drawing,
        aiImage: hostResult.aiImage,
        score: hostResult.score,
        feedback: hostResult.feedback
      },
      guestResult: {
        drawing: room.submissions.guest.drawing,
        aiImage: guestResult.aiImage,
        score: guestResult.score,
        feedback: guestResult.feedback
      },
      winner: judgeResult.winner,
      verdict: judgeResult.feedback
    }

    // Cache results so disconnected players can get them on reconnect
    room.cachedResults = resultsPayload
    io.to(code).emit('versusResults', resultsPayload)

    // Keep room alive for 2 minutes so reconnecting players can still get results
    setTimeout(() => {
      rooms.delete(code)
      console.log(`Room ${code} expired (post-results cleanup)`)
    }, 120000)
    console.log(`Room ${code} completed, results cached for 2min`)
  } catch (err) {
    console.error(`Room ${code} processing error:`, err)
    io.to(code).emit('error', { message: 'Something went wrong during processing!' })
    rooms.delete(code)
  }
}

// Serve React client in production
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist')
app.use(express.static(clientBuildPath))
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'))
})

httpServer.listen(PORT, () => {
  console.log(`✨ Pretty English server running on port ${PORT}`)
})
