// App.jsx
// ─────────────────────────────────────────────────────────────
// CONCEPT: Lifting state up
//
// The pipeline stage (which step we're on) is owned here in
// App — the parent. Both the pipeline tracker UI and the
// UploadZone need to know about / affect it. So the state
// lives at the level that controls both.
//
// When UploadZone calls onFileReady(file):
//   → App's handleFileReady runs
//   → App updates its own state
//   → App re-renders, passing new props down to children
//
// Data flows DOWN (via props).
// Events flow UP (via callback functions).
// This is the core data flow pattern in React.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import Header from './components/Header'
import Card from './components/Card'
import UploadZone from './components/UploadZone'
import styles from './App.module.css'

const STAGES = ['Upload', 'Analyse', 'Render', 'Done']

function App() {
  const [isDark, setIsDark]             = useState(true)
  const [currentStage, setCurrentStage] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light'
    )
  }, [isDark])

  function handleToggle() {
    setIsDark(prev => !prev)
  }

  function handleFileReady(file) {
    setSelectedFile(file)
    setCurrentStage(file ? 1 : 0)
  }

  function handleProcess() {
    if (currentStage === 1) {
      setCurrentStage(2)
    }
  }

  return (
    <div className={styles.app}>
      <Header isDark={isDark} onToggle={handleToggle} />

      <main className={styles.main}>

        <div className={styles.pipeline}>
          {STAGES.map((stage, index) => (
            <div key={stage} className={styles.stage}>
              <div className={`
                ${styles.stageNumber}
                ${index === currentStage ? styles.active : ''}
                ${index < currentStage ? styles.done : ''}
              `}>
                {index < currentStage ? '✓' : index + 1}
              </div>
              <span className={`
                ${styles.stageLabel}
                ${index === currentStage ? styles.stageLabelActive : ''}
              `}>
                {stage}
              </span>
              {index < STAGES.length - 1 && (
                <div className={`
                  ${styles.connector}
                  ${index < currentStage ? styles.connectorDone : ''}
                `} />
              )}
            </div>
          ))}
        </div>

        <div className={styles.grid}>

          <Card title="Floor Plan" icon="📐">
            <UploadZone onFileReady={handleFileReady} />
            {selectedFile && currentStage === 1 && (
              <button className={styles.processBtn} onClick={handleProcess}>
                Analyse with Gemini →
              </button>
            )}
          </Card>

          <Card title="3D Viewer" icon="🏗️" accent>
            <div className={styles.placeholder}>
              <span className={styles.placeholderIcon}>🧊</span>
              <p>Three.js viewer coming in Phase 5</p>
            </div>
          </Card>

          <Card title="Materials & Analysis" icon="🔬">
            <div className={styles.placeholder}>
              <span className={styles.placeholderIcon}>✨</span>
              <p>Gemini AI recommendations coming in Phase 6</p>
            </div>
          </Card>

        </div>
      </main>
    </div>
  )
}

export default App