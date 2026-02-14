import React, { useState, useRef, useEffect, useCallback } from 'react'
import './DrawingCanvas.css'
import { levels } from '../data/levels'
import ColorWheel from './ColorWheel'
import classicMannequin from '../assets/classic.png'

const CANVAS_SIZE = 800

const MANNEQUINS = [
  { id: 0, name: 'Classic', src: classicMannequin },
]



function DrawingCanvas({ level, onComplete, onBack }) {
  const levelData = levels.find(l => l.id === level)
  const bgCanvasRef = useRef(null)    // mannequin layer (bottom, untouchable)
  const drawCanvasRef = useRef(null)  // drawing layer (top, user draws here)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#FF6B6B')
  const [hexInput, setHexInput] = useState('#FF6B6B')
  const [brushSize, setBrushSize] = useState(5)
  const [tool, setTool] = useState('brush')
  const [history, setHistory] = useState([])
  const [selectedMannequin, setSelectedMannequin] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef(null)
  const lastPosRef = useRef(null)
  const wrapperRef = useRef(null)

  const drawMannequin = useCallback((ctx, mannequinId) => {
    const mannequin = MANNEQUINS[mannequinId] || MANNEQUINS[0]
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      // Draw image centered and scaled to fit the canvas
      const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height) * 0.9
      const w = img.width * scale
      const h = img.height * scale
      const x = (CANVAS_SIZE - w) / 2
      const y = (CANVAS_SIZE - h) / 2
      ctx.drawImage(img, x, y, w, h)
    }
    img.src = mannequin.src
  }, [])

  const saveToHistory = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (canvas) {
      const imageData = canvas.toDataURL()
      setHistory(prev => [...prev, imageData])
    }
  }, [])

  // Init: draw mannequin on bg canvas, clear drawing canvas
  useEffect(() => {
    if (selectedMannequin !== null) {
      const bgCanvas = bgCanvasRef.current
      if (bgCanvas) {
        const bgCtx = bgCanvas.getContext('2d')
        drawMannequin(bgCtx, selectedMannequin)
      }
      const drawCanvas = drawCanvasRef.current
      if (drawCanvas) {
        const drawCtx = drawCanvas.getContext('2d')
        drawCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        saveToHistory()
      }
    }
  }, [selectedMannequin, drawMannequin, saveToHistory])

  const getPos = (e) => {
    const canvas = drawCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_SIZE / rect.width
    const scaleY = CANVAS_SIZE / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  // ── Zoom with scroll wheel ──
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.15 : 0.15
    setZoom(prev => Math.min(5, Math.max(1, prev + delta)))
  }, [])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (wrapper) {
      wrapper.addEventListener('wheel', handleWheel, { passive: false })
      return () => wrapper.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Reset pan when zoom goes back to 1
  useEffect(() => {
    if (zoom <= 1) setPan({ x: 0, y: 0 })
  }, [zoom])

  const handleZoomIn = () => setZoom(prev => Math.min(5, prev + 0.5))
  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(1, prev - 0.5)
      if (next <= 1) setPan({ x: 0, y: 0 })
      return next
    })
  }
  const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  // ── Pan with middle mouse or two-finger drag ──
  const startPan = (clientX, clientY) => {
    setIsPanning(true)
    panStartRef.current = { x: clientX - pan.x, y: clientY - pan.y }
  }
  const movePan = (clientX, clientY) => {
    if (!isPanning || !panStartRef.current) return
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const maxPan = (zoom - 1) * wrapper.offsetWidth / 2
    const newX = Math.min(maxPan, Math.max(-maxPan, clientX - panStartRef.current.x))
    const newY = Math.min(maxPan, Math.max(-maxPan, clientY - panStartRef.current.y))
    setPan({ x: newX, y: newY })
  }
  const stopPan = () => { setIsPanning(false); panStartRef.current = null }

  const handleCanvasMouseDown = (e) => {
    // Middle mouse button = pan
    if (e.button === 1) {
      e.preventDefault()
      startPan(e.clientX, e.clientY)
      return
    }
    startDrawing(e)
  }

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      movePan(e.clientX, e.clientY)
      return
    }
    draw(e)
  }

  const handleCanvasMouseUp = (e) => {
    if (isPanning) { stopPan(); return }
    stopDrawing()
  }

  // Two-finger touch for pan (when zoomed)
  const lastTouchDistRef = useRef(null)
  const handleCanvasTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy)
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      startPan(midX, midY)
      return
    }
    startDrawing(e)
  }

  const handleCanvasTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (lastTouchDistRef.current) {
        const scale = dist / lastTouchDistRef.current
        setZoom(prev => Math.min(5, Math.max(1, prev * scale)))
        lastTouchDistRef.current = dist
      }
      // Pan
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      movePan(midX, midY)
      return
    }
    draw(e)
  }

  const handleCanvasTouchEnd = (e) => {
    if (e.touches.length < 2) {
      lastTouchDistRef.current = null
      stopPan()
    }
    if (e.touches.length === 0) stopDrawing()
  }

  // ── Flood Fill (paint bucket) ──
  const floodFill = useCallback((startX, startY, fillColor) => {
    const canvas = drawCanvasRef.current
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    const data = imageData.data
    const sx = Math.round(startX)
    const sy = Math.round(startY)

    // Parse fill color
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = 1; tempCanvas.height = 1
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.fillStyle = fillColor
    tempCtx.fillRect(0, 0, 1, 1)
    const fc = tempCtx.getImageData(0, 0, 1, 1).data

    const idx = (sy * CANVAS_SIZE + sx) * 4
    const targetR = data[idx], targetG = data[idx + 1], targetB = data[idx + 2], targetA = data[idx + 3]

    // Don't fill if clicking on the same color
    if (targetR === fc[0] && targetG === fc[1] && targetB === fc[2] && targetA === fc[3]) return

    const tolerance = 32
    const match = (i) => {
      return Math.abs(data[i] - targetR) <= tolerance &&
             Math.abs(data[i + 1] - targetG) <= tolerance &&
             Math.abs(data[i + 2] - targetB) <= tolerance &&
             Math.abs(data[i + 3] - targetA) <= tolerance
    }

    const stack = [[sx, sy]]
    const visited = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE)

    while (stack.length > 0) {
      const [x, y] = stack.pop()
      const pi = y * CANVAS_SIZE + x
      if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) continue
      if (visited[pi]) continue
      const i = pi * 4
      if (!match(i)) continue

      visited[pi] = 1
      data[i] = fc[0]; data[i + 1] = fc[1]; data[i + 2] = fc[2]; data[i + 3] = fc[3]

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }

    ctx.putImageData(imageData, 0, 0)
  }, [])

  const startDrawing = (e) => {
    e.preventDefault()
    const pos = getPos(e)
    lastPosRef.current = pos

    if (tool === 'fill') {
      saveToHistory()
      floodFill(pos.x, pos.y, color)
      saveToHistory()
      return
    }

    setIsDrawing(true)

    const canvas = drawCanvasRef.current
    const ctx = canvas.getContext('2d')

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, brushSize * 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }
  }

  const draw = (e) => {
    e.preventDefault()
    if (!isDrawing) return

    const pos = getPos(e)
    const canvas = drawCanvasRef.current
    const ctx = canvas.getContext('2d')

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
    }

    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPosRef.current = pos
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const canvas = drawCanvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.globalCompositeOperation = 'source-over'
      saveToHistory()
    }
  }

  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = [...history]
      newHistory.pop()
      const lastState = newHistory[newHistory.length - 1]

      const canvas = drawCanvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        ctx.drawImage(img, 0, 0)
      }
      img.src = lastState
      setHistory(newHistory)
    }
  }

  const handleClear = () => {
    const canvas = drawCanvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    saveToHistory()
  }

  // Flatten both layers into one image for submission
  const handleSubmit = () => {
    const mergedCanvas = document.createElement('canvas')
    mergedCanvas.width = CANVAS_SIZE
    mergedCanvas.height = CANVAS_SIZE
    const mergedCtx = mergedCanvas.getContext('2d')
    mergedCtx.drawImage(bgCanvasRef.current, 0, 0)
    mergedCtx.drawImage(drawCanvasRef.current, 0, 0)
    const imageData = mergedCanvas.toDataURL('image/png')
    onComplete({
      drawing: imageData,
      mannequin: selectedMannequin,
      theme: levelData.theme
    })
  }

  const handleColorChange = (c) => {
    setColor(c)
    setHexInput(c)
    setTool('brush')
  }

  const handleHexInputChange = (e) => {
    const val = e.target.value
    setHexInput(val)
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setColor(val)
      setTool('brush')
    }
  }

  // ── Auto-select the only mannequin ──
  useEffect(() => {
    if (selectedMannequin === null) {
      setSelectedMannequin(0)
    }
  }, [selectedMannequin])

  // ── Drawing screen ──
  return (
    <div className="drawing-screen">
      <button className="back-btn drawing-back" onClick={onBack}>← Back</button>

      <div className="drawing-layout">
        {/* Left info panel */}
        <div className="drawing-info-panel">
          <h2 className="bubble-text theme-display">🎨 {levelData?.theme}</h2>
          <p className="theme-instruction">Draw an outfit on the mannequin!</p>
        </div>

        {/* Canvas — two layers stacked */}
        <div className="canvas-wrapper" ref={wrapperRef}>
          <div
            className="canvas-zoom-container"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center center'
            }}
          >
            <canvas
              ref={bgCanvasRef}
              className="canvas-bg"
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
            />
            <canvas
              ref={drawCanvasRef}
              className="canvas-draw"
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onTouchStart={handleCanvasTouchStart}
              onTouchMove={handleCanvasTouchMove}
              onTouchEnd={handleCanvasTouchEnd}
            />
          </div>
          {zoom > 1 && (
            <div className="zoom-badge">{Math.round(zoom * 100)}%</div>
          )}
        </div>

        {/* Right tools panel */}
        <div className="tools-panel">
          <div className="tool-group">
            <span className="tool-group-label">Tool</span>
            <div className="tool-row">
              <button
                className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
                onClick={() => setTool('brush')}
                title="Brush"
              >✏️</button>
              <button
                className={`tool-btn ${tool === 'fill' ? 'active' : ''}`}
                onClick={() => setTool('fill')}
                title="Fill"
              >🪣</button>
              <button
                className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                onClick={() => setTool('eraser')}
                title="Eraser"
              >🧹</button>
            </div>
          </div>

          <div className="tool-group">
            <span className="tool-group-label">Size: {brushSize}</span>
            <input
              type="range"
              min="1"
              max="25"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="size-slider"
            />
          </div>

          <div className="tool-group">
            <span className="tool-group-label">Color</span>
            <ColorWheel color={color} onChange={handleColorChange} />
            <div className="hex-input-row">
              <div className="hex-preview" style={{ background: color }} />
              <input
                type="text"
                className="hex-input"
                value={hexInput}
                onChange={handleHexInputChange}
                placeholder="#FF6B6B"
                maxLength={7}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="tool-actions">
            <button className="action-btn undo-btn" onClick={handleUndo} title="Undo">↩ Undo</button>
            <button className="action-btn clear-btn" onClick={handleClear} title="Clear">🗑 Clear</button>
          </div>

          <div className="tool-group">
            <span className="tool-group-label">Zoom</span>
            <div className="tool-row">
              <button className="tool-btn" onClick={handleZoomOut} title="Zoom Out">➖</button>
              <button className="tool-btn" onClick={handleZoomReset} title="Reset" style={{fontSize:'11px'}}>{Math.round(zoom*100)}%</button>
              <button className="tool-btn" onClick={handleZoomIn} title="Zoom In">➕</button>
            </div>
          </div>

          <button className="action-btn submit-btn-canvas" onClick={handleSubmit}>
            ✨ Make it Real!
          </button>
        </div>
      </div>
    </div>
  )
}

export default DrawingCanvas
