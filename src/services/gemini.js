// src/services/gemini.js

const USE_MOCK = true

const SYSTEM_PROMPT = `You are an expert architectural analyst.
Analyse this floor plan image and return ONLY a valid JSON object. No markdown, no backticks, no explanation.

Example of the exact format:
{"outer_shell":{"width":100,"height":100},"rooms":[{"name":"Living Room","x":5,"y":5,"width":40,"height":35,"doors":[{"wall":"north","position":0.5,"width":8}],"windows":[{"wall":"east","position":0.4,"width":10}]}],"room_count":1,"total_area_sqft":1800,"building_type":"Residential","summary":"A description here."}

Wall names: "north" = top wall, "south" = bottom wall, "east" = right wall, "west" = left wall.
position = 0.0 to 1.0 along that wall (0=start, 0.5=middle, 1=end).
width = opening width in the same 0-100 scale.

Rules:
- Normalise ALL coordinates and dimensions to a 0-100 scale
- Every room must have at least one door
- Add windows to rooms that would realistically have them
- Every number must be an actual number, not a placeholder
- Return ONLY the JSON object`

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getMockResponse() {
  return {
    outer_shell: { width: 100, height: 100 },
    rooms: [
      {
        name: 'Master Bedroom',
        x: 0, y: 0, width: 28, height: 38,
        doors: [{ wall: 'south', position: 0.5, width: 12 }],
        windows: [{ wall: 'north', position: 0.5, width: 10 }, { wall: 'west', position: 0.5, width: 8 }]
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
          { wall: 'north', position: 0.5, width: 12 },
          { wall: 'east',  position: 0.5, width: 12 }
        ],
        windows: []
      },
      {
        name: 'Bathroom',
        x: 0, y: 69, width: 28, height: 31,
        doors: [{ wall: 'east', position: 0.5, width: 8 }],
        windows: [{ wall: 'west', position: 0.5, width: 8 }]
      },
      {
        name: 'Living Room',
        x: 28, y: 28, width: 59, height: 72,
        doors: [
          { wall: 'west',  position: 0.2, width: 12 },
          { wall: 'west',  position: 0.7, width: 8 },
          { wall: 'north', position: 0.2, width: 12 },
          { wall: 'north', position: 0.7, width: 12 }
        ],
        windows: [
          { wall: 'south', position: 0.3, width: 12 },
          { wall: 'south', position: 0.7, width: 12 },
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

export async function analyseFloorPlan(file) {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    return getMockResponse()
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not found. Check your .env file.')

  const base64Image = await fileToBase64(file)
  const mimeType = file.type

  const requestBody = {
    contents: [{
      parts: [
        { text: SYSTEM_PROMPT },
        { inline_data: { mime_type: mimeType, data: base64Image } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Gemini API request failed')
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini')

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in Gemini response')
  return JSON.parse(jsonMatch[0])
}