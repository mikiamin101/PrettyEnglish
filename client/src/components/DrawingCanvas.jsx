import React, { useState, useRef, useEffect, useCallback } from 'react'
import './DrawingCanvas.css'
import { levels } from '../data/levels'
import ColorWheel from './ColorWheel'
import classicMannequin from '../assets/classic.png'

const CANVAS_SIZE = 400

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
  const lastPosRef = useRef(null)

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

  const startDrawing = (e) => {
    e.preventDefault()
    const pos = getPos(e)
    lastPosRef.current = pos
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
        <div className="canvas-wrapper">
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
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
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
            <button className="action-btn submit-btn-canvas" onClick={handleSubmit}>
              ✨ Make it Real!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DrawingCanvas
