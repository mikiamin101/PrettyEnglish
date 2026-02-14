import { Router } from 'express'

const router = Router()

router.post('/process', async (req, res) => {
  try {
    const { drawing, theme, mannequin } = req.body

    let generatedImage = drawing // fallback to original drawing
    let score = parseFloat((Math.random() * 3 + 7).toFixed(1)) // fallback random
    let feedback = 'Great design! Keep experimenting!'

    if (!process.env.OPENAI_API_KEY) {
      return res.json({ generatedImage, score, feedback, theme })
    }

    // ── Step 1: Generate fashion image with GPT-4o (image input → image output) ──
    try {
      const generateResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `You are a fashion design AI. The user will send you a sketch/drawing of an outfit on a mannequin. 
Your task is to describe this outfit in vivid detail so it can be used to generate a realistic fashion image.
Describe: colors, garment types, patterns, accessories, style, and overall aesthetic.
Theme: "${theme}". Respond with ONLY a JSON object: {"description": "<detailed outfit description>"}`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Describe this ${theme} outfit sketch in detail:` },
                { type: 'image_url', image_url: { url: drawing } }
              ]
            }
          ],
          max_tokens: 300
        })
      })

      let outfitDescription = `A stylish ${theme} outfit`

      if (generateResponse.ok) {
        const descData = await generateResponse.json()
        const descContent = descData.choices[0].message.content
        try {
          const parsed = JSON.parse(descContent)
          outfitDescription = parsed.description
        } catch {
          outfitDescription = descContent
        }
      }

      // Now generate the actual image with DALL-E 3
      const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `A fashion model walking on a runway stage, facing directly toward the camera, full front view, wearing: ${outfitDescription}. Theme: ${theme}. Catwalk fashion show, studio lighting, high quality, elegant, full body shot, audience in background, fashion week style.`,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          response_format: 'b64_json'
        })
      })

      if (dalleResponse.ok) {
        const dalleData = await dalleResponse.json()
        if (dalleData.data?.[0]?.b64_json) {
          generatedImage = `data:image/png;base64,${dalleData.data[0].b64_json}`
        }
      } else {
        const errText = await dalleResponse.text()
        console.error('DALL-E error:', dalleResponse.status, errText)
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

    res.json({
      generatedImage,
      score,
      feedback,
      theme
    })
  } catch (err) {
    console.error('AI processing error:', err)
    res.status(500).json({ error: 'AI processing failed' })
  }
})

export default router
