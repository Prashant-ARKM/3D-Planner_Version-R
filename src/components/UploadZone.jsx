// UploadZone.jsx
// ─────────────────────────────────────────────────────────────
// CONCEPT: Multiple pieces of state
// Each useState call manages one independent value.
// When any setter is called, React re-renders this component.
//
// CONCEPT: Event handlers
// Functions that run when the user does something —
// clicks, drags, drops, changes input, etc.
// In JSX they look like: onClick={handleClick}
//
// CONCEPT: Conditional rendering
// {condition && <Element />} — renders Element only if condition is true
// {condition ? <A /> : <B />} — renders A if true, B if false
// ─────────────────────────────────────────────────────────────

import { useState, useRef } from 'react'
import styles from './UploadZone.module.css'

// CONCEPT: Props with a callback
// onFileReady is a function passed in from the parent (App.jsx).
// When the user picks a valid file, we call onFileReady(file)
// to tell the parent "hey, a file is ready — do something with it."
// The child doesn't know what happens next — that's the parent's job.
function UploadZone({ onFileReady }) {

  // ── State ──────────────────────────────────────────────────
  const [file, setFile]           = useState(null)  // File object
  const [preview, setPreview]     = useState(null)  // image URL for preview
  const [isDragging, setIsDragging] = useState(false) // drag-over highlight
  const [error, setError]         = useState(null)  // validation error message

  // useRef gives us a reference to a real DOM element.
  // We use it to trigger the hidden <input type="file"> click.
  const inputRef = useRef(null)

  // ── Helpers ────────────────────────────────────────────────

  // Validates and processes a File object
  function processFile(selectedFile) {
    setError(null)

    // Validate file type
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp']
    if (!allowed.includes(selectedFile.type)) {
      setError('Please upload a PNG, JPG, WEBP, or BMP image.')
      return
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    // Create a temporary URL so we can preview the image
    // URL.createObjectURL makes a local browser URL from a File object
    const previewURL = URL.createObjectURL(selectedFile)

    setFile(selectedFile)
    setPreview(previewURL)

    // Tell the parent a file is ready
    if (onFileReady) onFileReady(selectedFile)
  }

  // ── Event Handlers ─────────────────────────────────────────

  // When user picks a file via the file browser dialog
  function handleInputChange(e) {
    const selected = e.target.files[0]
    if (selected) processFile(selected)
  }

  // Click the hidden input when the zone is clicked
  function handleZoneClick() {
    inputRef.current.click()
  }

  // Drag over — highlight the zone
  function handleDragOver(e) {
    e.preventDefault() // necessary to allow drop
    setIsDragging(true)
  }

  // Drag leave — remove highlight
  function handleDragLeave() {
    setIsDragging(false)
  }

  // Drop — extract the file from the drag event
  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) processFile(dropped)
  }

  // Clear and start over
  function handleClear() {
    setFile(null)
    setPreview(null)
    setError(null)
    // Reset the file input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
    if (onFileReady) onFileReady(null)
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className={styles.wrapper}>

      {/* Hidden file input — triggered by zone click */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/bmp"
        className={styles.hiddenInput}
        onChange={handleInputChange}
      />

      {/* Drop zone — only show if no file yet */}
      {!preview && (
        <div
          className={`${styles.zone} ${isDragging ? styles.dragging : ''}`}
          onClick={handleZoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className={styles.zoneIcon}>
            {isDragging ? '📂' : '📐'}
          </div>
          <p className={styles.zoneTitle}>
            {isDragging ? 'Release to upload' : 'Drop your floor plan here'}
          </p>
          <p className={styles.zoneHint}>
            or <span className={styles.browse}>click to browse</span>
          </p>
          <p className={styles.zoneFormats}>PNG · JPG · WEBP · BMP · max 10MB</p>
        </div>
      )}

      {/* Error message — conditional rendering */}
      {error && (
        <div className={styles.error}>
          ⚠️ {error}
        </div>
      )}

      {/* Preview — only shown after a file is selected */}
      {preview && (
        <div className={styles.preview}>
          <img
            src={preview}
            alt="Floor plan preview"
            className={styles.previewImg}
          />
          <div className={styles.previewMeta}>
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileSize}>
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <button className={styles.clearBtn} onClick={handleClear}>
              ✕ Remove
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default UploadZone