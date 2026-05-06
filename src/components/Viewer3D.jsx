// src/components/Viewer3D.jsx
// ─────────────────────────────────────────────────────────────
// WALL BUILDING APPROACH:
// 1. Collect all wall edges from all rooms as line segments
// 2. Find shared edges (interior walls) vs unique edges (exterior walls)
// 3. Draw each wall exactly once
// 4. Cut door/window holes into the correct single wall
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg'
import styles from './Viewer3D.module.css'

const WALL_HEIGHT   = 10
const WALL_T        = 0.6
const FLOOR_T       = 0.2
const DOOR_H        = 7.2
const WIN_H         = 3.5
const WIN_BOTTOM    = 3.0

const ROOM_COLORS = {
  'living room':    0x1a4a6b,
  'kitchen':        0x5c3a1a,
  'master bedroom': 0x1a5c3a,
  'bedroom':        0x1a3a5c,
  'bathroom':       0x3a1a5c,
  'corridor':       0x2a2a3a,
  'hallway':        0x2a2a3a,
  'dining':         0x5c1a3a,
  'default':        0x1a3a4a,
}

function getRoomColor(name) {
  const k = name.toLowerCase()
  for (const [type, color] of Object.entries(ROOM_COLORS)) {
    if (k.includes(type)) return color
  }
  return ROOM_COLORS.default
}

// Round to nearest 0.5 units — gives tolerance for near-touching walls
function r(n) { return Math.round(n * 2) / 2 }

// Build a wall key that's the same regardless of direction
// so we can detect shared edges
function edgeKey(x1, z1, x2, z2) {
  const a = `${r(x1)},${r(z1)}`
  const b = `${r(x2)},${r(z2)}`
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

// CSG subtract — cut cutter shape out of base mesh
function csgSubtract(evaluator, baseMesh, cutterMesh) {
  const base   = new Brush(baseMesh.geometry, baseMesh.material)
  base.position.copy(baseMesh.position)
  base.updateMatrixWorld()

  const cutter = new Brush(cutterMesh.geometry, cutterMesh.material)
  cutter.position.copy(cutterMesh.position)
  cutter.updateMatrixWorld()

  return evaluator.evaluate(base, cutter, SUBTRACTION)
}

// Build one wall mesh, optionally cutting openings into it
function buildWallMesh(evaluator, wallMat, cutMat, cx, cy, cz, ww, wh, wd, openings, axis) {
  // axis: 'x' = wall runs along X (north/south), 'z' = wall runs along Z (east/west)
  const geo  = new THREE.BoxGeometry(ww, wh, wd)
  let mesh   = new THREE.Mesh(geo, wallMat)
  mesh.position.set(cx, cy, cz)

  for (const op of openings) {
    const isDoor = op.type === 'door'
    const oW     = op.width
    const oH     = isDoor ? DOOR_H + 0.2 : WIN_H + 0.2
    const oY     = isDoor ? oH / 2 - 0.1 : WIN_BOTTOM + WIN_H / 2

    // Offset along the wall from its center
    const offset = (op.position - 0.5) * (axis === 'x' ? ww : wd)

    const cutGeo  = axis === 'x'
      ? new THREE.BoxGeometry(oW, oH, wd + 0.5)
      : new THREE.BoxGeometry(ww + 0.5, oH, oW)

    const cutMesh = new THREE.Mesh(cutGeo, cutMat)
    cutMesh.position.set(
      axis === 'x' ? cx + offset : cx,
      oY,
      axis === 'z' ? cz + offset : cz
    )

    const result = csgSubtract(evaluator, mesh, cutMesh)
    result.castShadow    = true
    result.receiveShadow = true
    mesh = result
  }

  mesh.castShadow    = true
  mesh.receiveShadow = true
  return mesh
}

function Viewer3D({ floorData, isDark }) {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!floorData || !mountRef.current) return

    const container = mountRef.current
    const W = container.clientWidth
    const H = container.clientHeight

    // ── Scene setup ─────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(isDark ? 0x080c14 : 0xe8edf5)
    scene.fog = new THREE.Fog(isDark ? 0x080c14 : 0xe8edf5, 120, 300)

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, isDark ? 1.5 : 2.5))
    const sun = new THREE.DirectionalLight(0xffffff, isDark ? 2.5 : 3.5)
    sun.position.set(80, 120, 80)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(isDark ? 0x4488ff : 0xaaccff, 0.8)
    fill.position.set(-60, 40, -40)
    scene.add(fill)

    // Grid
    const grid = new THREE.GridHelper(240, 48,
      isDark ? 0x1e2d45 : 0xb0bec5,
      isDark ? 0x1e2d45 : 0xb0bec5
    )
    grid.position.set(50, -0.05, 50)
    scene.add(grid)

    // Materials
    const wallMat  = new THREE.MeshLambertMaterial({ color: 0xd4b896 })
    const cutMat   = new THREE.MeshLambertMaterial({ color: 0xff0000 })
    const glassMat = new THREE.MeshLambertMaterial({
      color: isDark ? 0x88ccff : 0xaaddff,
      transparent: true, opacity: 0.2,
    })

    const evaluator = new Evaluator()

    // ── Step 1: Collect all edges with their openings ────────
    // Each edge: { x1, z1, x2, z2, axis, openings[], roomNames[] }
    // Key = normalized edge string so we can detect duplicates

    const edgeMap = new Map()
    // Also store openings per edge keyed by roomName+wall
    const openingMap = new Map() // edgeKey → openings[]

    floorData.rooms.forEach(room => {
      const rx = room.x, rz = room.y
      const rw = room.width, rd = room.height

      // Four edges of this room
      const edges = [
        { x1: rx,      z1: rz,      x2: rx + rw, z2: rz,      axis: 'x', wall: 'north' },
        { x1: rx,      z1: rz + rd, x2: rx + rw, z2: rz + rd, axis: 'x', wall: 'south' },
        { x1: rx,      z1: rz,      x2: rx,      z2: rz + rd, axis: 'z', wall: 'west'  },
        { x1: rx + rw, z1: rz,      x2: rx + rw, z2: rz + rd, axis: 'z', wall: 'east'  },
      ]

      edges.forEach(edge => {
        const key = edgeKey(edge.x1, edge.z1, edge.x2, edge.z2)

        if (!edgeMap.has(key)) {
          edgeMap.set(key, { ...edge, roomCount: 1, roomNames: [room.name] })
          openingMap.set(key, [])
        } else {
          // Shared edge — mark as interior
          const existing = edgeMap.get(key)
          existing.roomCount++
          existing.roomNames.push(room.name)
        }

        // Collect openings for this wall from this room
        const doors   = (room.doors   || []).filter(d => d.wall === edge.wall).map(d => ({ ...d, type: 'door',   width: d.width }))
        const windows = (room.windows || []).filter(w => w.wall === edge.wall).map(w => ({ ...w, type: 'window', width: w.width }))
        const ops = openingMap.get(key)
        ops.push(...doors, ...windows)
      })
    })

    // ── Step 2: Draw each wall exactly once ──────────────────
    edgeMap.forEach((edge, key) => {
      const { x1, z1, x2, z2, axis, roomCount } = edge
      const openings = openingMap.get(key) || []

      // Wall length and center
      const len = axis === 'x' ? Math.abs(x2 - x1) : Math.abs(z2 - z1)
      if (len < 0.1) return

      const cx = (x1 + x2) / 2
      const cz = (z1 + z2) / 2
      const cy = WALL_HEIGHT / 2

      // Interior walls are slightly thinner
      const t = roomCount > 1 ? WALL_T * 0.8 : WALL_T

      const ww = axis === 'x' ? len : t
      const wd = axis === 'z' ? len : t

      // Scale opening widths from 0-100 space
      const scaledOpenings = openings.map(op => ({
        ...op,
        width: op.width,
      }))

      const wall = buildWallMesh(evaluator, wallMat.clone(), cutMat, cx, cy, cz, ww, WALL_HEIGHT, wd, scaledOpenings, axis)
      scene.add(wall)

      // Window glass panes
      openings.filter(op => op.type === 'window').forEach(win => {
        const oW  = win.width
        const gCY = WIN_BOTTOM + WIN_H / 2
        const offset = (win.position - 0.5) * len

        const gw = axis === 'x' ? oW : 0.12
        const gd = axis === 'z' ? oW : 0.12

        const gGeo  = new THREE.BoxGeometry(gw, WIN_H, gd)
        const gMesh = new THREE.Mesh(gGeo, glassMat)
        gMesh.position.set(
          axis === 'x' ? cx + offset : cx,
          gCY,
          axis === 'z' ? cz + offset : cz
        )
        scene.add(gMesh)
      })
    })

    // ── Step 3: Draw floor slabs ──────────────────────────────
    floorData.rooms.forEach(room => {
      const rx = room.x, rz = room.y
      const rw = room.width, rd = room.height
      const color = getRoomColor(room.name)

      const floorGeo  = new THREE.BoxGeometry(rw, FLOOR_T, rd)
      const floorMat  = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.92 })
      const floorMesh = new THREE.Mesh(floorGeo, floorMat)
      floorMesh.position.set(rx + rw / 2, -FLOOR_T / 2, rz + rd / 2)
      floorMesh.receiveShadow = true
      scene.add(floorMesh)

      // Room label
      const canvas2d = document.createElement('canvas')
      canvas2d.width = 256; canvas2d.height = 64
      const ctx = canvas2d.getContext('2d')
      ctx.clearRect(0, 0, 256, 64)
      ctx.font = 'bold 18px sans-serif'
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)'
      ctx.textAlign = 'center'
      ctx.fillText(room.name, 128, 40)
      const tex    = new THREE.CanvasTexture(canvas2d)
      const lblGeo = new THREE.PlaneGeometry(Math.min(rw * 0.85, 18), 3.5)
      const lblMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      const lbl    = new THREE.Mesh(lblGeo, lblMat)
      lbl.position.set(rx + rw / 2, 0.3, rz + rd / 2)
      lbl.rotation.x = -Math.PI / 2
      scene.add(lbl)
    })

    // ── Camera positioning ────────────────────────────────────
    // Find the center of the whole floor plan
    const allX = floorData.rooms.map(r => r.x + r.width / 2)
    const allZ = floorData.rooms.map(r => r.y + r.height / 2)
    const cx   = (Math.min(...floorData.rooms.map(r => r.x)) + Math.max(...floorData.rooms.map(r => r.x + r.width))) / 2
    const cz   = (Math.min(...floorData.rooms.map(r => r.y)) + Math.max(...floorData.rooms.map(r => r.y + r.height))) / 2

    const target = new THREE.Vector3(cx, 0, cz)
    let spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 200 }

    function updateCamera() {
      camera.position.set(
        target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta),
        target.y + spherical.radius * Math.cos(spherical.phi),
        target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta)
      )
      camera.lookAt(target)
    }
    updateCamera()

    // ── Orbit controls ────────────────────────────────────────
    let isDragging = false
    let prevMouse  = { x: 0, y: 0 }

    function onMouseDown(e) { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY } }
    function onMouseMove(e) {
      if (!isDragging) return
      spherical.theta -= (e.clientX - prevMouse.x) * 0.007
      spherical.phi    = Math.max(0.1, Math.min(Math.PI / 2.1, spherical.phi + (e.clientY - prevMouse.y) * 0.007))
      prevMouse = { x: e.clientX, y: e.clientY }
      updateCamera()
    }
    function onMouseUp()  { isDragging = false }
    function onWheel(e) {
      e.preventDefault()
      spherical.radius = Math.max(30, Math.min(300, spherical.radius + e.deltaY * 0.25))
      updateCamera()
    }

    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    container.addEventListener('wheel', onWheel, { passive: false })

    let animId
    function animate() { animId = requestAnimationFrame(animate); renderer.render(scene, camera) }
    animate()

    function onResize() {
      const w = container.clientWidth, h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }

  }, [floorData, isDark])

  return (
    <div className={styles.wrapper}>
      {floorData ? (
        <>
          <div ref={mountRef} className={styles.canvas} />
          <div className={styles.hint}>🖱️ Drag to orbit · Scroll to zoom</div>
        </>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🏗️</span>
          <p>3D model will appear here after analysis</p>
        </div>
      )}
    </div>
  )
}

export default Viewer3D