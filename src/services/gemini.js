// src/services/gemini.js

const USE_MOCK = true

// ── Grid overlay utility ─────────────────────────────────────
function drawGridOverlay(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas  = document.createElement('canvas')
      const PADDING = 40
      canvas.width  = img.width  + PADDING
      canvas.height = img.height + PADDING

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, PADDING, 0, img.width, img.height)

      ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)'
      ctx.lineWidth   = 1
      ctx.font        = 'bold 11px sans-serif'
      ctx.fillStyle   = '#cc0000'
      ctx.textAlign   = 'center'

      for (let i = 0; i <= 10; i++) {
        const val  = i * 10
        const xPos = PADDING + (img.width  * i / 10)
        const yPos =            img.height * i / 10

        ctx.beginPath()
        ctx.moveTo(xPos, 0)
        ctx.lineTo(xPos, img.height)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(PADDING, yPos)
        ctx.lineTo(canvas.width, yPos)
        ctx.stroke()

        ctx.fillText(String(val), xPos, img.height + 14)
        ctx.textAlign = 'right'
        ctx.fillText(String(val), PADDING - 4, yPos + 4)
        ctx.textAlign = 'center'
      }

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
function getMockFloorData() {
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
          { wall: 'west',  position: 0.2,  width: 12 },
          { wall: 'west',  position: 0.7,  width: 8  },
          { wall: 'north', position: 0.2,  width: 12 },
          { wall: 'north', position: 0.7,  width: 12 }
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

function getMockMaterials() {
  return {
    materials: [
      {
        element: 'Foundation',
        material: 'M20 Grade RCC with Fe415 TMT Bars',
        cost: 3,
        durability: 3,
        reasoning: 'For a 2100 sqft L-shaped residential structure, M20 grade concrete (1:1.5:3 mix) with Fe415 TMT reinforcement bars provides the necessary load-bearing capacity. The L-shape creates uneven load distribution requiring stepped footing at the corner junction.',
        alternatives: 'M15 grade was rejected — insufficient for this floor area. Plain cement concrete would lack tensile strength for the L-shape corner loads.',
        approx_cost: '₹180–220 per sqft'
      },
      {
        element: 'Exterior Walls',
        material: 'Red Clay Brick with CM 1:6 Mortar',
        cost: 2,
        durability: 3,
        reasoning: 'Red clay bricks (230×115×75mm) with cement-sand mortar in 1:6 ratio is the most reliable choice for Indian residential exterior walls. Provides excellent thermal mass keeping interiors cool in summer — critical for Indian climate.',
        alternatives: 'AAC blocks considered but rejected for exterior — lower thermal mass means higher cooling costs. Fly ash bricks are cheaper but have lower compressive strength.',
        approx_cost: '₹45–55 per sqft'
      },
      {
        element: 'Interior Walls',
        material: 'AAC Blocks (600×200×150mm)',
        cost: 2,
        durability: 2,
        reasoning: 'Autoclaved Aerated Concrete blocks are ideal for interior partition walls in this residence. They are lightweight (reduces structural load by 30%), excellent sound insulation between bedroom and living room, and easy to cut for electrical/plumbing chases.',
        alternatives: 'Red brick for interior walls would increase dead load unnecessarily. Drywall/gypsum partitions lack durability for Indian conditions and humidity.',
        approx_cost: '₹35–42 per sqft'
      },
      {
        element: 'Flooring',
        material: 'Double Charged Vitrified Tiles (600×600mm)',
        cost: 2,
        durability: 3,
        reasoning: 'Double charged vitrified tiles with 8-10mm thickness are the standard choice for Indian residential flooring. For the living room (largest space), 600×600mm size reduces grout lines. Bathroom gets anti-skid ceramic tiles (300×300mm) for safety.',
        alternatives: 'Marble considered for master bedroom but 3x cost with similar durability. Hardwood flooring rejected — poor performance in Indian humidity and high maintenance.',
        approx_cost: '₹55–85 per sqft (tiles) + ₹25–35 per sqft (laying)'
      },
      {
        element: 'Roof',
        material: 'RCC Flat Roof — M20 Concrete, 125mm Slab',
        cost: 3,
        durability: 3,
        reasoning: 'RCC flat roof is the standard for Indian residential construction. 125mm thick slab with M20 concrete and Fe415 TMT bars at 150mm c/c spacing. The L-shape requires careful attention to the junction — additional beam support recommended at x=28, y=28 corner.',
        alternatives: 'Sloped GI sheet roof rejected — unsuitable for permanent residential structure and poor aesthetics. Precast slabs considered but custom L-shape requires cast-in-situ for structural integrity.',
        approx_cost: '₹200–250 per sqft'
      },
      {
        element: 'Doors',
        material: 'Sal Wood Frame with Flush Door Shutters',
        cost: 2,
        durability: 3,
        reasoning: 'Sal wood (Shorea robusta) frames with commercial flush door shutters (35mm thick) are the most durable and cost-effective choice for Indian residential doors. Main entrance (Entrance room) should use solid core flush door with MS frame for security.',
        alternatives: 'UPVC doors considered for bathroom — rejected for higher cost. Hollow core flush doors rejected for interior — poor sound insulation between bedroom and corridor.',
        approx_cost: '₹4,500–8,000 per door (interior) · ₹12,000–18,000 (main entrance)'
      },
      {
        element: 'Windows',
        material: 'UPVC Sliding Windows with 5mm Glass',
        cost: 2,
        durability: 3,
        reasoning: 'UPVC frames with 5mm float glass provide excellent weather sealing — critical for the north-facing kitchen and master bedroom windows which face prevailing winds. Better thermal insulation than aluminium, no corrosion, and minimal maintenance over 20+ year lifespan.',
        alternatives: 'Aluminium windows cheaper but 40% lower thermal insulation. Wooden frames require annual painting and warp in monsoon humidity.',
        approx_cost: '₹850–1,200 per sqft of window area'
      },
      {
        element: 'Plumbing',
        material: 'CPVC Pipes (Hot) + UPVC Pipes (Cold/Drainage)',
        cost: 2,
        durability: 3,
        reasoning: 'CPVC pipes for hot water lines (kitchen, bathroom) withstand temperatures up to 93°C — essential for Indian solar water heater systems. UPVC for cold water supply and drainage. The bathroom and kitchen placement on opposite sides of the building requires careful routing — recommend a central plumbing shaft.',
        alternatives: 'GI pipes rejected — corrode within 10 years in Indian water conditions. PPR pipes considered but CPVC has better availability and lower cost in Indian market.',
        approx_cost: '₹45,000–65,000 total for this floor plan'
      },
      {
        element: 'Electrical',
        material: 'FR PVC Insulated Copper Wires (IS:694)',
        cost: 2,
        durability: 3,
        reasoning: 'Fire Resistant PVC insulated copper wires conforming to IS:694 are mandatory for Indian residential construction. 4mm² for power circuits, 2.5mm² for lighting. The L-shape requires a distribution board centrally placed — recommended near the corridor for equidistant runs to all rooms.',
        alternatives: 'Aluminium wiring rejected — poor conductivity, higher fire risk, not recommended by BIS for residential use. Armoured cables unnecessary for concealed wiring in RCC structure.',
        approx_cost: '₹55,000–75,000 total including DB, switches, and wiring'
      }
    ]
  }
}

// ── Call 1: Understand layout ────────────────────────────────
async function callGeminiUnderstand(apiKey, base64Image, mimeType) {
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
async function callGeminiMeasure(apiKey, gridBase64, layoutDescription) {
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
- Return ONLY the JSON`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/png', data: gridBase64 } }
        ]}],
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
console.log('MATERIALS RAW:', text)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in Gemini response')
  return JSON.parse(jsonMatch[0])
}

// ── Call 3: Material recommendations ────────────────────────
async function callGeminiMaterials(apiKey, floorData) {
  const roomList = floorData.rooms.map(r => r.name).join(', ')

  const prompt = `You are a senior structural engineer and construction materials expert specialising in Indian residential construction.

Analyse this building and recommend optimal construction materials:
- Building type: ${floorData.building_type}
- Total area: ${floorData.total_area_sqft} sqft
- Rooms: ${roomList}
- Shape: ${floorData.summary}

For each building element below, recommend the optimal material for Indian market conditions (climate, availability, cost in INR, standard practices as per BIS codes).

Analyse cost vs durability/strength tradeoffs honestly. Mention specific alternatives considered and why they were rejected. All prices must be in Indian Rupees (₹) reflecting current Indian market rates (2024-25).

Building elements to cover:
1. Foundation
2. Exterior Walls
3. Interior Walls
4. Flooring
5. Roof
6. Doors
7. Windows
8. Plumbing
9. Electrical

Return ONLY valid JSON — no markdown, no backticks:
{"materials":[{"element":"Foundation","material":"specific material name and grade","cost":2,"durability":3,"reasoning":"specific reasoning for THIS building","alternatives":"what was considered and rejected","approx_cost":"₹X–Y per sqft or total"}]}

cost and durability are integers 1-3 (1=low, 2=medium, 3=high).
Return ONLY the JSON.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4000 }
      })
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Gemini Call 3 failed')
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini Call 3')

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in materials response')
  return JSON.parse(jsonMatch[0])
}

// ── Main export ───────────────────────────────────────────────
export async function analyseFloorPlan(file, onStatus) {
  if (USE_MOCK) {
    onStatus('🔍 Reading floor plan layout...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    onStatus('📐 Preparing coordinate grid...')
    await new Promise(resolve => setTimeout(resolve, 800))
    onStatus('📏 Extracting precise coordinates...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    onStatus('🧱 Analysing construction materials...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      ...getMockFloorData(),
      ...getMockMaterials()
    }
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not found. Check your .env file.')

  const mimeType    = file.type
  const base64Image = await fileToBase64(file)

  onStatus('🔍 Reading floor plan layout...')
  const layoutDescription = await callGeminiUnderstand(apiKey, base64Image, mimeType)

  onStatus('📐 Preparing coordinate grid...')
  const gridBase64 = await drawGridOverlay(file)

  onStatus('📏 Extracting precise coordinates...')
  const floorData = await callGeminiMeasure(apiKey, gridBase64, layoutDescription)

  onStatus('🧱 Analysing construction materials...')
  const materialsData = await callGeminiMaterials(apiKey, floorData)

  return { ...floorData, ...materialsData }
}