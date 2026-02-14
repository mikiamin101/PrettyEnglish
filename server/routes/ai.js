import { Router } from 'express'

const router = Router()

router.post('/process', async (req, res) => {
  try {
    const { drawing, theme, mannequin } = req.body

    // ── Step 1: Image-to-Image with Stability AI ──
    let generatedImage = drawing // fallback to original drawing

    if (process.env.STABILITY_API_KEY) {
      try {
        const base64Data = drawing.replace(/^data:image\/\w+;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')

        const formData = new FormData()
        const blob = new Blob([imageBuffer], { type: 'image/png' })

        formData.append('init_image', blob, 'drawing.png')
        formData.append('init_image_mode', 'IMAGE_STRENGTH')
        formData.append('image_strength', '0.35')
        formData.append('text_prompts[0][text]',
          `A fashion model wearing a ${theme} outfit, professional fashion photography, stylish, elegant, high quality, studio lighting`
        )
        formData.append('text_prompts[0][weight]', '1')
        formData.append('cfg_scale', '7')
        formData.append('samples', '1')
        formData.append('steps', '30')

        const stabilityResponse = await fetch(
          'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
            },
            body: formData
          }
        )

        if (stabilityResponse.ok) {
          const stabilityData = await stabilityResponse.json()
          if (stabilityData.artifacts?.[0]) {
            generatedImage = `data:image/png;base64,${stabilityData.artifacts[0].base64}`
          }
        } else {
          console.error('Stability API error:', stabilityResponse.status)
        }
      } catch (err) {
        console.error('Stability AI error:', err.message)
      }
    }

    // ── Step 2: Score with GPT-4o Vision ──
    let score = parseFloat((Math.random() * 3 + 7).toFixed(1)) // fallback random

    if (process.env.OPENAI_API_KEY) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: `You are a fashion judge in a fun game. Rate the outfit in the image on a scale of 1-10 based on:
1. How well it fits the theme "${theme}"
2. Creativity and originality
3. Overall aesthetic appeal

Be encouraging but fair. Respond with ONLY a JSON object: {"score": <number>, "feedback": "<brief encouraging feedback>"}`
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Rate this ${theme} outfit design:` },
                  { type: 'image_url', image_url: { url: generatedImage } }
                ]
              }
            ],
            max_tokens: 200
          })
        })

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json()
          const content = openaiData.choices[0].message.content
          try {
            const parsed = JSON.parse(content)
            score = parsed.score
          } catch {
            // If JSON parse fails, try to extract number
            const match = content.match(/\d+\.?\d*/)
            if (match) score = parseFloat(match[0])
          }
        }
      } catch (err) {
        console.error('OpenAI error:', err.message)
      }
    }

    res.json({
      generatedImage,
      score,
      theme
    })
  } catch (err) {
    console.error('AI processing error:', err)
    res.status(500).json({ error: 'AI processing failed' })
  }
})

export default router
