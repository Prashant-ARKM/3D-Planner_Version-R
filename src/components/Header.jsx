// Header.jsx
// ─────────────────────────────────────────────────────────────
// This is your first custom React component.
//
// CONCEPT: Props
// A component can receive data from its parent via "props" —
// short for properties. Like function arguments, but for UI.
//
// This Header receives two props:
//   isDark   → boolean, is the theme currently dark?
//   onToggle → function, what to do when toggle is clicked
//
// The parent (App.jsx) owns the state. Header just displays
// it and calls onToggle when clicked. This is called
// "lifting state up" — a core React pattern.
// ─────────────────────────────────────────────────────────────

import styles from './Header.module.css'

function Header({ isDark, onToggle }) {
  return (
    <header className={styles.header}>

      {/* ── Logo ── */}
      <div className={styles.logo}>
        <div className={styles.logoMark}>
          <span>3D</span>
          <span className={styles.logoP}>P</span>
        </div>
        <div className={styles.logoText}>
          <span className={styles.title}>3D Planner</span>
          <span className={styles.subtitle}>AI Floor Plan Pipeline</span>
        </div>
      </div>

      {/* ── Right side ── */}
      <div className={styles.right}>

        {/* Status badge */}
        <div className={styles.badge}>
          <span className={styles.dot} />
          Ready
        </div>

        {/* Theme toggle */}
        <button
          className={styles.toggle}
          onClick={onToggle}
          aria-label="Toggle theme"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

      </div>
    </header>
  )
}

export default Header