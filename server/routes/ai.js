import { Router } from 'express'

const router = Router()

router.post('/process', async (req, res) => {
  try {
    const { drawing, theme, mannequin, outfitItems } = req.body
    const itemsList = (outfitItems || []).join(', ')

    let generatedImage = drawing // fallback to original drawing
    let score = parseFloat((Math.random() * 3 + 7).toFixed(1)) // fallback random
    let feedback = 'Great design! Keep experimenting!'

    if (!process.env.OPENAI_API_KEY) {
      return res.json({ generatedImage, score, feedback, theme })
    }

    // ── Step 1: Image-to-image with gpt-image-1.5 (sketch → photo) ──
    try {
      console.log('Step 1: Sending drawing to gpt-image-1.5 for sketch-to-photo...')
      const base64Data = drawing.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')

      const formData = new FormData()
      const imageBlob = new Blob([imageBuffer], { type: 'image/png' })
      formData.append('image[]', imageBlob, 'drawing.png')
      formData.append('model', 'gpt-image-1.5')
      formData.append('prompt', `Turn this fashion sketch drawing into a photorealistic photograph of a fashion model on a runway catwalk, facing the camera, full body shot. The outfit consists of: ${itemsList}. Preserve the exact outfit design, colors, patterns, and style from the sketch. Theme: ${theme}. Natural studio lighting, fashion week photography, realistic fabric textures and draping. Do not add new clothing elements beyond what is listed. No text, no watermarks.`)
      formData.append('n', '1')
      formData.append('size', '1024x1024')
      formData.append('quality', 'low')

      const editResponse = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData
      })

      if (editResponse.ok) {
        const editData = await editResponse.json()
        const item = editData.data?.[0]
        console.log('gpt-image-1.5 response keys:', item ? Object.keys(item) : 'no data')

        if (item?.b64_json) {
          generatedImage = `data:image/png;base64,${item.b64_json}`
          console.log('gpt-image-1.5 success (b64)! Image length:', generatedImage.length)
        } else if (item?.url) {
          console.log('gpt-image-1.5 returned URL, downloading server-side...')
          const imgResponse = await fetch(item.url)
          if (imgResponse.ok) {
            const imgArrayBuffer = await imgResponse.arrayBuffer()
            const imgBase64 = Buffer.from(imgArrayBuffer).toString('base64')
            generatedImage = `data:image/png;base64,${imgBase64}`
            console.log('Downloaded & converted! Image length:', generatedImage.length)
          }
        }
      } else {
        const errText = await editResponse.text()
        console.error('gpt-image-1.5 edit error:', editResponse.status, errText)
      }
    } catch (err) {
      console.error('Image generation error:', err.message)
    }

    // ── Step 2: Score the generated image with GPT-4o Vision ──
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
              content: `You are a fashion judge in a fun game for someone learning English. Rate the outfit on a scale of 1 to 10 based on:
1. How well it fits the theme "${theme}"
2. Creativity and originality  
3. Overall aesthetic appeal

Scoring guidelines:
- Aim to give high scores (7-10) when the design shows effort and fits the theme reasonably well.
- Give medium scores (4-6) if the design is mediocre or only loosely fits the theme.
- Give low scores (1-3) ONLY if the design is truly terrible, makes no sense, or completely ignores the theme.
- Be encouraging in your feedback — push the player to do even better next time!

Respond with ONLY a JSON object: {"score": <number between 1 and 10, can use one decimal>, "feedback": "<brief encouraging feedback in English, 1-2 sentences>"}`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Rate this ${theme} outfit:` },
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

    const responsePayload = {
      generatedImage,
      score,
      feedback,
      theme
    }
    console.log('Response payload size:', JSON.stringify(responsePayload).length, 'bytes')
    console.log('Generated image is original?', generatedImage === drawing)
    res.json(responsePayload)
  } catch (err) {
    console.error('AI processing error:', err)
    res.status(500).json({ error: 'AI processing failed' })
  }
})

export default router
