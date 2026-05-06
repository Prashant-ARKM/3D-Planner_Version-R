// App.jsx
// ─────────────────────────────────────────────────────────────
// CONCEPT: useState — React's memory
//
// React components are just functions. But functions normally
// forget everything when they finish running. useState gives
// a component "memory" — a value that persists between renders
// and causes the UI to update when it changes.
//
// const [isDark, setIsDark] = useState(true)
//   isDark    → the current value (starts as true)
//   setIsDark → the function to update it
//
// Rule: NEVER do `isDark = false` directly.
//       ALWAYS use `setIsDark(false)`.
//       Direct mutation doesn't trigger a re-render.
//
// CONCEPT: data-theme attribute
// Instead of swapping CSS classes, we set an attribute on
// the <html> element. Our global.css watches for
// [data-theme="light"] and swaps all the CSS variables.
// One attribute change → entire app recolors. Clean.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import Header from './components/Header'
import Card from './components/Card'
import styles from './App.module.css'

function App() {
  // useState gives us: current value + a setter function
  const [isDark, setIsDark] = useState(true)

  // useEffect runs after the component renders.
  // Here we use it to sync our isDark state with the
  // actual HTML element's attribute — that's what triggers
  // the CSS variable swap in global.css.
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light'
    )
  }, [isDark]) // the [isDark] means: re-run this when isDark changes

  // This function flips the theme.
  // We pass it down to Header as a prop.
  function handleToggle() {
    setIsDark(prev => !prev) // !prev means "opposite of current value"
  }

  return (
    <div className={styles.app}>

      {/* Header receives isDark and handleToggle as props */}
      <Header isDark={isDark} onToggle={handleToggle} />

      <main className={styles.main}>

        {/* Pipeline stage tracker — placeholder for now */}
        <div className={styles.pipeline}>
          {['Upload', 'Analyse', 'Render', 'Done'].map((stage, index) => (
            <div key={stage} className={styles.stage}>
              <div className={`${styles.stageNumber} ${index === 0 ? styles.active : ''}`}>
                {index + 1}
              </div>
              <span className={styles.stageLabel}>{stage}</span>
              {index < 3 && <div className={styles.connector} />}
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className={styles.grid}>

          <Card title="Floor Plan" icon="📐">
            <div className={styles.placeholder}>
              <span className={styles.placeholderIcon}>⬆️</span>
              <p>Upload zone coming in Phase 3</p>
            </div>
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