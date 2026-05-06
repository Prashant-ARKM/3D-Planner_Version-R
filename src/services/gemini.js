// src/services/gemini.js

const USE_MOCK = true
// ── Grid overlay utility ─────────────────────────────────────
// Draws a 0-100 coordinate grid over the floor plan image
// so Gemini can read exact coordinates visually
function drawGridOverlay(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas  = document.createElement('canvas')
      const GRID    = 10  // grid divisions
      const PADDING = 40  // space for axis labels

      canvas.width  = img.width  + PADDING
      canvas.height = img.height + PADDING

      const ctx = canvas.getContext('2d')

      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw the floor plan image offset by padding
      ctx.drawImage(img, PADDING, 0, img.width, img.height)

      // Grid lines and labels
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)'
      ctx.lineWidth   = 1
      ctx.font        = 'bold 11px sans-serif'
      ctx.fillStyle   = '#cc0000'
      ctx.textAlign   = 'center'

      for (let i = 0; i <= GRID; i++) {
        const val = i * 10  // 0, 10, 20 ... 100
        const xPos = PADDING + (img.width  * i / GRID)
        const yPos =            img.height * i / GRID

        // Vertical grid line
        ctx.beginPath()
        ctx.moveTo(xPos, 0)
        ctx.lineTo(xPos, img.height)
        ctx.stroke()

        // Horizontal grid line
        ctx.beginPath()
        ctx.moveTo(PADDING, yPos)
        ctx.lineTo(canvas.width, yPos)
        ctx.stroke()

        // X axis labels (bottom)
        ctx.fillText(String(val), xPos, img.height + 14)

        // Y axis labels (left)
        ctx.textAlign = 'right'
        ctx.fillText(String(val), PADDING - 4, yPos + 4)
        ctx.textAlign = 'center'
      }

      // Axis titles
      ctx.font      = 'bold 12px sans-serif'
      ctx.fillStyle = '#cc0000'
      ctx.fillText('X →', canvas.width - 10, img.height + 14)
      ctx.save()
      ctx.translate(12, img.height / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText('Y ↓', 0, 0)
      ctx.restore()

      // Convert canvas to base64
      const base64 = canvas.toDataURL('image/png').split(',')[1]
      URL.revokeObjectURL(url)
      resolve(base64)
    }

    img.onerror = reject
    img.src = url
  })
}

// ── Helper: file to base64 ───────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Mock response ─────────────────────────────────────────────
function getMockResponse() {
  return {
    outer_shell: { width: 100, height: 100 },
    rooms: [
      {
        name: 'Master Bedroom',
        x: 0, y: 0, width: 28, height: 38,
        doors: [{ wall: 'south', position: 0.5, width: 9 }],
        windows: [ { wall: 'west', position: 0.5, width: 8 }]
      },
      {
        name: 'Kitchen',
        x: 28, y: 0, width: 37, height: 28,
        doors: [{ wall: 'south', position: 0.5, width: 12 }],
        windows: [{ wall: 'north', position: 0.5, width: 14 }]
      },
      {
        name: 'Entrance',
        x: 65, y: 0, width: 35, height: 28,
        doors: [
          { wall: 'south', position: 0.3, width: 12 },
          { wall: 'south', position: 0.85, width: 5 }
        ],
        windows: [{ wall: 'east', position: 0.5, width: 10 }]
      },
      {
        name: 'Corridor',
        x: 0, y: 38, width: 28, height: 31,
        doors: [
          { wall: 'east',  position: 0.5, width: 20 }
        ],
        windows: []
      },
      {
        name: 'Bathroom',
        x: 0, y: 69, width: 28, height: 31,
        doors: [{ wall: 'east', position: 0.5, width: 15 }],
        windows: []
      },
      {
        name: 'Living Room',
        x: 28, y: 28, width: 59, height: 72,
        doors: [
          { wall: 'west',  position: 0.2,  width: 12 },
          { wall: 'west',  position: 0.7,  width: 8  },
          { wall: 'north', position: 0.2,  width: 12 },
          { wall: 'north', position: 0.7,  width: 12 }
        ],
        windows: [
          { wall: 'south', position: 0.5, width: 12 },
          { wall: 'east',  position: 0.5, width: 12 }
        ]
      },
    ],
    room_count: 6,
    total_area_sqft: 2100,
    building_type: 'Residential',
    summary: 'An L-shaped residential floor plan with a large central living area, master bedroom and corridor on the left wing, kitchen and entrance across the top, and a bathroom connecting directly to the living room.'
  }
}

// ── Call 1: Understand the layout ────────────────────────────
async function callGeminiUnderstand(apiKey, base64Image, mimeType) {
  const prompt = `You are an expert architectural analyst examining a floor plan image.

Your task is to carefully study this floor plan and identify every distinct enclosed space.

For each space you find, describe:
1. What type of room it appears to be (bedroom, kitchen, bathroom, living room, corridor, entrance, etc.)
2. Its approximate position in the floor plan (top-left, top-right, center, bottom-left, etc.)
3. Its approximate size relative to other rooms (large, medium, small)
4. Which walls have doors (look for quarter-circle arcs indicating door swings)
5. Which walls have windows (look for thin parallel lines crossing the wall)
6. Whether it connects to the outside or to other specific rooms

Be thorough — identify every room, corridor, and enclosed space you can see.
Describe the overall shape of the building (rectangular, L-shaped, U-shaped, etc.)

Write your analysis in plain English. Be specific about door and window locations.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Image } }
          ]
        }],
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

// ── Call 2: Extract precise coordinates ──────────────────────
async function callGeminiMeasure(apiKey, gridBase64, mimeType, layoutDescription) {
  const prompt = `You are an expert architectural analyst.

Below is a description of a floor plan layout that was analysed from an image:

--- LAYOUT DESCRIPTION ---
${layoutDescription}
--- END DESCRIPTION ---

Now you are looking at the SAME floor plan image but with a coordinate grid overlay.
The grid goes from 0 to 100 on both X (horizontal) and Y (vertical) axes.
Red grid lines are drawn every 10 units with labels on the edges.

Using this grid, extract the PRECISE coordinates of every room described above.

Return ONLY a valid JSON object in this exact format — no markdown, no backticks, no explanation:

{"outer_shell":{"width":100,"height":100},"rooms":[{"name":"Room Name","x":0,"y":0,"width":50,"height":50,"doors":[{"wall":"south","position":0.5,"width":10}],"windows":[{"wall":"north","position":0.5,"width":12}]}],"room_count":6,"total_area_sqft":1800,"building_type":"Residential","summary":"Brief description."}

Rules:
- wall names: "north"=top, "south"=bottom, "east"=right, "west"=left
- position: 0.0 to 1.0 along that wall (0=start, 0.5=middle, 1=end)
- width: opening size in the 0-100 coordinate scale (typical door = 8-12, window = 8-15)
- ALL coordinates must be real numbers read from the grid
- Every room needs at least one door
- Return ONLY the JSON`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/png', data: gridBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 3000 }
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

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in Gemini response')
  return JSON.parse(jsonMatch[0])
}

// ── Main export: full two-call pipeline ──────────────────────
// onStatus is a callback to update the UI with progress messages
export async function analyseFloorPlan(file, onStatus) {
  if (USE_MOCK) {
    onStatus('Reading floor plan layout...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    onStatus('Extracting precise coordinates...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    return getMockResponse()
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not found. Check your .env file.')

  const mimeType    = file.type
  const base64Image = await fileToBase64(file)

  // Call 1 — Understand the layout
  onStatus('🔍 Reading floor plan layout...')
  const layoutDescription = await callGeminiUnderstand(apiKey, base64Image, mimeType)

  // Draw grid overlay on the image
  onStatus('📐 Preparing coordinate grid...')
  const gridBase64 = await drawGridOverlay(file)

  // Call 2 — Extract precise coordinates
  onStatus('📏 Extracting precise coordinates...')
  const result = await callGeminiMeasure(apiKey, gridBase64, mimeType, layoutDescription)

  return result
}