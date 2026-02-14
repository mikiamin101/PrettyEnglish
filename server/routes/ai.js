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

    // ── Step 1: GPT-4o Vision describes the outfit ──
    let outfitDescription = ''
    try {
      console.log('Step 1: GPT-4o describing the drawing...')
      const descResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Look at this fashion sketch drawn by a player. Describe ONLY the outfit/clothing in detail: the garment types (dress, pants, shirt, skirt, etc.), colors, patterns, accessories, and style. Be very specific about colors and design details. Do NOT mention the mannequin, canvas, or background. Keep it to 2-3 sentences. Theme: "${theme}".`
                },
                { type: 'image_url', image_url: { url: drawing } }
              ]
            }
          ],
          max_tokens: 200
        })
      })

      if (descResponse.ok) {
        const descData = await descResponse.json()
        outfitDescription = descData.choices[0].message.content
        console.log('Outfit description:', outfitDescription)
      } else {
        console.error('Description error:', descResponse.status, await descResponse.text())
      }
    } catch (err) {
      console.error('Description error:', err.message)
    }

    // ── Step 2: DALL-E 3 generates a realistic photo from the description ──
    if (outfitDescription) {
      try {
        console.log('Step 2: DALL-E 3 generating realistic photo...')
        const imagePrompt = `A professional fashion photograph of a model on a runway catwalk, facing the camera, full body shot, wearing this outfit: ${outfitDescription}. Theme: ${theme}. Fashion week style, studio lighting, high quality, elegant, photorealistic.`

        const genResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: imagePrompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            response_format: 'b64_json'
          })
        })

        if (genResponse.ok) {
          const genData = await genResponse.json()
          const item = genData.data?.[0]

          if (item?.b64_json) {
            generatedImage = `data:image/png;base64,${item.b64_json}`
            console.log('DALL-E 3 success (b64)! Image length:', generatedImage.length)
          } else if (item?.url) {
            // Fallback: download URL server-side
            console.log('DALL-E 3 returned URL, downloading server-side...')
            const imgResponse = await fetch(item.url)
            if (imgResponse.ok) {
              const imgArrayBuffer = await imgResponse.arrayBuffer()
              const imgBase64 = Buffer.from(imgArrayBuffer).toString('base64')
              generatedImage = `data:image/png;base64,${imgBase64}`
              console.log('Downloaded & converted! Image length:', generatedImage.length)
            } else {
              console.error('Failed to download DALL-E URL:', imgResponse.status)
            }
          }
        } else {
          const errText = await genResponse.text()
          console.error('DALL-E 3 generation error:', genResponse.status, errText)
        }
      } catch (err) {
        console.error('Image generation error:', err.message)
      }
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
