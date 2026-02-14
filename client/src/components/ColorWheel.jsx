import React, { useRef, useEffect, useState, useCallback } from 'react'

const SIZE = 180
const RING_WIDTH = 24
const RING_OUTER = SIZE / 2
const RING_INNER = RING_OUTER - RING_WIDTH
const SQ_MARGIN = 8
const SQ_SIZE = Math.floor((RING_INNER - SQ_MARGIN) * Math.sqrt(2))
const SQ_OFFSET = Math.floor((SIZE - SQ_SIZE) / 2)

function hsvToRgb(h, s, v) {
  let r, g, b
  const i = Math.floor(h / 60) % 6
  const f = h / 60 - Math.floor(h / 60)
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch (i) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
    default: r = v; g = t; b = p
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  const s = max === 0 ? 0 : d / max
  return [h, s, max]
}

export default function ColorWheel({ color, onChange }) {
  const canvasRef = useRef(null)
  const [hue, setHue] = useState(() => hexToHsv(color)[0])
  const [sat, setSat] = useState(() => hexToHsv(color)[1])
  const [val, setVal] = useState(() => hexToHsv(color)[2])
  const [dragging, setDragging] = useState(null) // 'ring' | 'square' | null

  const cx = SIZE / 2
  const cy = SIZE / 2

  const drawWheel = useCallback((ctx) => {
    ctx.clearRect(0, 0, SIZE, SIZE)

    // ── Draw hue ring ──
    for (let angle = 0; angle < 360; angle += 0.5) {
      const startAngle = (angle - 1) * Math.PI / 180
      const endAngle = (angle + 1) * Math.PI / 180
      const [r, g, b] = hsvToRgb(angle, 1, 1)
      ctx.beginPath()
      ctx.arc(cx, cy, RING_OUTER - 1, startAngle, endAngle)
      ctx.arc(cx, cy, RING_INNER, endAngle, startAngle, true)
      ctx.closePath()
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fill()
    }

    // ── Draw saturation/value square ──
    const imgData = ctx.createImageData(SQ_SIZE, SQ_SIZE)
    for (let y = 0; y < SQ_SIZE; y++) {
      for (let x = 0; x < SQ_SIZE; x++) {
        const s = x / (SQ_SIZE - 1)
        const v = 1 - y / (SQ_SIZE - 1)
        const [r, g, b] = hsvToRgb(hue, s, v)
        const idx = (y * SQ_SIZE + x) * 4
        imgData.data[idx] = r
        imgData.data[idx + 1] = g
        imgData.data[idx + 2] = b
        imgData.data[idx + 3] = 255
      }
    }
    ctx.putImageData(imgData, SQ_OFFSET, SQ_OFFSET)

    // ── Draw hue indicator on ring ──
    const hueAngle = hue * Math.PI / 180
    const ringMid = (RING_OUTER + RING_INNER) / 2
    const hx = cx + Math.cos(hueAngle) * ringMid
    const hy = cy + Math.sin(hueAngle) * ringMid
    ctx.beginPath()
    ctx.arc(hx, hy, RING_WIDTH / 2 - 2, 0, Math.PI * 2)
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 1
    ctx.stroke()

    // ── Draw SV indicator ──
    const sx = SQ_OFFSET + sat * (SQ_SIZE - 1)
    const sy = SQ_OFFSET + (1 - val) * (SQ_SIZE - 1)
    ctx.beginPath()
    ctx.arc(sx, sy, 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
  }, [hue, sat, val, cx, cy])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) drawWheel(ctx)
  }, [drawWheel])

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = SIZE / rect.width
    const scaleY = SIZE / rect.height
    let clientX, clientY
    if (e.touches) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const updateFromPos = useCallback((pos, target) => {
    if (target === 'ring') {
      const angle = Math.atan2(pos.y - cy, pos.x - cx) * 180 / Math.PI
      const newHue = (angle + 360) % 360
      setHue(newHue)
      const [r, g, b] = hsvToRgb(newHue, sat, val)
      onChange(rgbToHex(r, g, b))
    } else if (target === 'square') {
      const newSat = Math.max(0, Math.min(1, (pos.x - SQ_OFFSET) / (SQ_SIZE - 1)))
      const newVal = Math.max(0, Math.min(1, 1 - (pos.y - SQ_OFFSET) / (SQ_SIZE - 1)))
      setSat(newSat)
      setVal(newVal)
      const [r, g, b] = hsvToRgb(hue, newSat, newVal)
      onChange(rgbToHex(r, g, b))
    }
  }, [cx, cy, hue, sat, val, onChange])

  const hitTest = (pos) => {
    const dx = pos.x - cx
    const dy = pos.y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist >= RING_INNER && dist <= RING_OUTER) return 'ring'

    if (
      pos.x >= SQ_OFFSET && pos.x <= SQ_OFFSET + SQ_SIZE &&
      pos.y >= SQ_OFFSET && pos.y <= SQ_OFFSET + SQ_SIZE
    ) return 'square'

    return null
  }

  const handleDown = (e) => {
    e.preventDefault()
    const pos = getMousePos(e)
    const target = hitTest(pos)
    if (target) {
      setDragging(target)
      updateFromPos(pos, target)
    }
  }

  const handleMove = (e) => {
    e.preventDefault()
    if (!dragging) return
    const pos = getMousePos(e)
    updateFromPos(pos, dragging)
  }

  const handleUp = () => {
    setDragging(null)
  }

  // Sync external color changes
  useEffect(() => {
    if (!dragging) {
      const [h, s, v] = hexToHsv(color)
      setHue(h)
      setSat(s)
      setVal(v)
    }
  }, [color, dragging])

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className="color-wheel-canvas"
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
      onTouchStart={handleDown}
      onTouchMove={handleMove}
      onTouchEnd={handleUp}
    />
  )
}
