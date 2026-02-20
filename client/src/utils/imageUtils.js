export function resizeImage(dataUrl, maxSize = 300) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > h) {
        if (w > maxSize) { h = h * maxSize / w; w = maxSize }
      } else {
        if (h > maxSize) { w = w * maxSize / h; h = maxSize }
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
