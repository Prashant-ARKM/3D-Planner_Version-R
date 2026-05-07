// api/analyse.js
// Vercel Serverless Function — API key never exposed to browser

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' })
  }

  const { action, payload } = req.body

  try {
    let result
    if (action === 'understand')     result = await callGeminiUnderstand(apiKey, payload)
    else if (action === 'measure')   result = await callGeminiMeasure(apiKey, payload)
    else if (action === 'materials') result = await callGeminiMaterials(apiKey, payload)
    else return res.status(400).json({ error: 'Unknown action' })
    res.status(200).json({ result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── Safe JSON parser ─────────────────────────────────────────
function safeParseJSON(text) {
  const cleaned = text
    .replace(/```json|```/g, '')
    .replace(/[\u0080-\uFFFF]/g, '')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\t/g, ' ')
    .trim()

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in Gemini response')
  
  const jsonStr = jsonMatch[0]
  try {
    return JSON.parse(jsonStr)
  } catch(e) {
    // Log context around the error position
    const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || 0)
    const context = jsonStr.substring(Math.max(0, pos-30), pos+30)
    throw new Error(`JSON parse failed at pos ${pos}. Context: "${context}"`)
  }
}

// ── Call 1: Understand layout ────────────────────────────────
async function callGeminiUnderstand(apiKey, { base64Image, mimeType }) {
  const prompt = `You are an expert architectural analyst examining a floor plan image.

Carefully study this floor plan and identify every distinct enclosed space.

For each space describe:
1. What type of room it is (bedroom, kitchen, bathroom, living room, corridor, entrance, etc.)
2. Its approximate position (top-left, top-right, center, bottom-left, etc.)
3. Its size relative to other rooms (large, medium, small)
4. Which walls have doors — look for quarter-circle arcs indicating door swings
5. Which walls have windows — look for thin parallel lines crossing the wall
6. Whether it connects outside or to specific other rooms

Also describe the overall building shape (rectangular, L-shaped, U-shaped, etc.) and total approximate area.

Be thorough and specific. Write in plain English.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Image } }
        ]}],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2000 }
      })
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Gemini Call 1 failed')
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ── Call 2: Extract coordinates ──────────────────────────────
async function callGeminiMeasure(apiKey, { gridBase64, layoutDescription }) {
  const prompt = `You are an expert architectural analyst.

A floor plan was previously analysed and described as follows:
--- LAYOUT DESCRIPTION ---
${layoutDescription}
--- END DESCRIPTION ---

You are now looking at the SAME floor plan with a coordinate grid overlay.
The grid goes from 0 to 100 on both X (horizontal) and Y (vertical) axes.
Red grid lines appear every 10 units with labels on the edges.

Using this grid, extract PRECISE coordinates of every room.

Return ONLY valid JSON — no markdown, no backticks, no explanation:
{"outer_shell":{"width":100,"height":100},"rooms":[{"name":"Room Name","x":0,"y":0,"width":50,"height":50,"doors":[{"wall":"south","position":0.5,"width":10}],"windows":[{"wall":"north","position":0.5,"width":12}]}],"room_count":6,"total_area_sqft":1800,"building_type":"Residential","summary":"Brief description."}

Rules:
- wall: "north"=top, "south"=bottom, "east"=right, "west"=left
- position: 0.0 to 1.0 along wall (0=start, 0.5=middle, 1=end)
- width: opening size in 0-100 scale (door=8-12, window=8-15)
- All coordinates must be real numbers read from the grid
- Every room needs at least one door
- Keep all numeric values to max 1 decimal place
- Use only ASCII characters in all string values
- Return ONLY the JSON with no extra whitespace`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/png', data: gridBase64 } }
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8000 }
      })
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Gemini Call 2 failed')
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini Call 2')
  return safeParseJSON(text)
}

// ── Call 3: Material recommendations ────────────────────────
async function callGeminiMaterials(apiKey, { floorData }) {
  const roomList = floorData.rooms.map(r => r.name).join(', ')

  const prompt = `You are a senior structural engineer and construction materials expert specialising in Indian residential construction.

Analyse this building and recommend optimal construction materials:
- Building type: ${floorData.building_type}
- Total area: ${floorData.total_area_sqft} sqft
- Rooms: ${roomList}
- Shape: ${floorData.summary}
- Return minified JSON only — no spaces, no indentation, no newlines
- Example: {"rooms":[{"name":"A","x":0,"y":0}]} not formatted JSON

For each building element, recommend optimal material for Indian market conditions. Analyse cost vs durability tradeoffs. All prices in Indian Rupees reflecting 2024-25 market rates.

Building elements: Foundation, Exterior Walls, Interior Walls, Flooring, Roof, Doors, Windows, Plumbing, Electrical

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no extra text before or after.
Use ONLY ASCII characters — do NOT use rupee symbol, write INR instead.

Format:
{"materials":[{"element":"Foundation","material":"name","cost":2,"durability":3,"reasoning":"reasoning","alternatives":"alternatives","approx_cost":"INR X-Y per sqft"}]}

cost and durability are integers 1-3 only. Return ONLY the JSON.`

  let response
  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8000 }
        })
      }
    )
    if (response.ok) break
    if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt))
  }

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Gemini Call 3 failed after 3 attempts')
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini Call 3')
  return safeParseJSON(text)
}