// src/services/gemini.js
// ─────────────────────────────────────────────────────────────
// Frontend service — calls our own /api/analyse endpoint.
// The API key never touches the browser.
// ─────────────────────────────────────────────────────────────

const USE_MOCK = false

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

// ── Call our own API route ────────────────────────────────────
async function callAPI(action, payload) {
  const response = await fetch('/api/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'API call failed')
  }

  const data = await response.json()
  return data.result
}

// ── Mock floor data ───────────────────────────────────────────
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
        cost: 3, durability: 3,
        reasoning: 'For a 2100 sqft L-shaped residential structure, M20 grade concrete (1:1.5:3 mix) with Fe415 TMT reinforcement bars provides the necessary load-bearing capacity.',
        alternatives: 'M15 grade was rejected — insufficient for this floor area.',
        approx_cost: 'INR 180-220 per sqft'
      },
      {
        element: 'Exterior Walls',
        material: 'Red Clay Brick with CM 1:6 Mortar',
        cost: 2, durability: 3,
        reasoning: 'Red clay bricks with cement-sand mortar in 1:6 ratio provides excellent thermal mass keeping interiors cool in summer.',
        alternatives: 'AAC blocks considered but rejected for exterior — lower thermal mass means higher cooling costs.',
        approx_cost: 'INR 45-55 per sqft'
      },
      {
        element: 'Interior Walls',
        material: 'AAC Blocks (600x200x150mm)',
        cost: 2, durability: 2,
        reasoning: 'Lightweight, excellent sound insulation, easy to cut for electrical/plumbing chases.',
        alternatives: 'Red brick would increase dead load unnecessarily.',
        approx_cost: 'INR 35-42 per sqft'
      },
      {
        element: 'Flooring',
        material: 'Double Charged Vitrified Tiles (600x600mm)',
        cost: 2, durability: 3,
        reasoning: 'Standard choice for Indian residential flooring. Bathroom gets anti-skid ceramic tiles for safety.',
        alternatives: 'Marble 3x cost. Hardwood poor in Indian humidity.',
        approx_cost: 'INR 55-85 per sqft + INR 25-35 per sqft laying'
      },
      {
        element: 'Roof',
        material: 'RCC Flat Roof — M20 Concrete, 125mm Slab',
        cost: 3, durability: 3,
        reasoning: 'Standard for Indian residential construction. L-shape requires additional beam support at corner junction.',
        alternatives: 'Sloped GI sheet roof rejected — unsuitable for permanent structure.',
        approx_cost: 'INR 200-250 per sqft'
      },
      {
        element: 'Doors',
        material: 'Sal Wood Frame with Flush Door Shutters',
        cost: 2, durability: 3,
        reasoning: 'Most durable and cost-effective for Indian residential doors. Main entrance uses solid core with MS frame for security.',
        alternatives: 'Hollow core flush doors rejected — poor sound insulation.',
        approx_cost: 'INR 4500-8000 per door (interior), INR 12000-18000 (main entrance)'
      },
      {
        element: 'Windows',
        material: 'UPVC Sliding Windows with 5mm Glass',
        cost: 2, durability: 3,
        reasoning: 'Excellent weather sealing, better thermal insulation than aluminium, no corrosion.',
        alternatives: 'Aluminium cheaper but 40% lower thermal insulation.',
        approx_cost: 'INR 850-1200 per sqft of window area'
      },
      {
        element: 'Plumbing',
        material: 'CPVC Pipes (Hot) + UPVC Pipes (Cold/Drainage)',
        cost: 2, durability: 3,
        reasoning: 'CPVC withstands 93C for solar water heater systems. UPVC for cold supply and drainage.',
        alternatives: 'GI pipes corrode within 10 years in Indian water conditions.',
        approx_cost: 'INR 45000-65000 total'
      },
      {
        element: 'Electrical',
        material: 'FR PVC Insulated Copper Wires (IS:694)',
        cost: 2, durability: 3,
        reasoning: 'Mandatory for Indian residential construction. Distribution board near corridor for equidistant runs.',
        alternatives: 'Aluminium wiring rejected — higher fire risk, not recommended by BIS.',
        approx_cost: 'INR 55000-75000 total including DB, switches, and wiring'
      }
    ]
  }
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
    return { ...getMockFloorData(), ...getMockMaterials() }
  }

  const mimeType    = file.type
  const base64Image = await fileToBase64(file)

  // Call 1 — Understand layout
  onStatus('🔍 Reading floor plan layout...')
  const layoutDescription = await callAPI('understand', { base64Image, mimeType })

  // Generate grid overlay
  onStatus('📐 Preparing coordinate grid...')
  const gridBase64 = await drawGridOverlay(file)

  // Call 2 — Extract coordinates
  onStatus('📏 Extracting precise coordinates...')
  const floorData = await callAPI('measure', { gridBase64, layoutDescription })

  // Call 3 — Material recommendations
  onStatus('🧱 Analysing construction materials...')
  const materialsData = await callAPI('materials', { floorData })

  return { ...floorData, ...materialsData }
}