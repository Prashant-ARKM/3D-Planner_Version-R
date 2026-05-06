// src/services/gemini.js

const USE_MOCK = true  // Set to false to use real Gemini API

const SYSTEM_PROMPT = `You are an expert architectural analyst.
Analyse this floor plan image and return ONLY a valid JSON object. No markdown, no backticks, no explanation, no placeholder text.

Example of the exact format to return:
{"outer_shell":{"width":100,"height":80},"rooms":[{"name":"Living Room","x":5,"y":5,"width":40,"height":35}],"room_count":1,"total_area_sqft":1800,"building_type":"Residential","summary":"A description here."}

Now analyse the floor plan and return the same structure with real values from the image. Every number must be an actual number, not a placeholder.`

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
    outer_shell: { width: 100, height: 80 },
    rooms: [
      { name: 'Living Room',    x: 5,  y: 5,  width: 40, height: 35 },
      { name: 'Kitchen',        x: 55, y: 5,  width: 40, height: 25 },
      { name: 'Master Bedroom', x: 5,  y: 45, width: 35, height: 30 },
      { name: 'Bedroom 2',      x: 45, y: 45, width: 25, height: 30 },
      { name: 'Bathroom',       x: 75, y: 35, width: 20, height: 20 },
      { name: 'Corridor',       x: 40, y: 35, width: 15, height: 10 },
    ],
    room_count: 6,
    total_area_sqft: 1800,
    building_type: 'Residential',
    summary: 'A well-proportioned residential floor plan featuring an open living area, modern kitchen, two bedrooms, and a centrally located bathroom. The layout ensures good natural flow between spaces.'
  }
}

export async function analyseFloorPlan(file) {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    return getMockResponse()
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('Gemini API key not found. Check your .env file.')
  }

  const base64Image = await fileToBase64(file)
  const mimeType = file.type

  const requestBody = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1000,
    }
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

  if (!text) {
    throw new Error('No response from Gemini')
  }

  // Aggressively extract JSON — handles thinking text and markdown wrapping
  console.log('RAW GEMINI RESPONSE:', text)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in Gemini response')
  const parsed = JSON.parse(jsonMatch[0])

  return parsed
}