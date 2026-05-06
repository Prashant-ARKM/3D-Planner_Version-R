// Card.jsx
// ─────────────────────────────────────────────────────────────
// CONCEPT: Reusable components + children prop
//
// A Card is a generic container — it doesn't know or care
// what's inside it. Whatever you put between <Card> and </Card>
// in JSX becomes the special "children" prop automatically.
//
// Example usage:
//   <Card title="Upload" icon="📁">
//     <p>Content goes here</p>
//   </Card>
//
// Props this component accepts:
//   title    → string, the card heading
//   icon     → string, an emoji or icon
//   children → anything — React passes this automatically
//   accent   → boolean, whether to show accent border (optional)
// ─────────────────────────────────────────────────────────────

import styles from './Card.module.css'

function Card({ title, icon, children, accent = false }) {
  return (
    <div className={`${styles.card} ${accent ? styles.accented : ''}`}>

      {/* Only render the header if a title was provided */}
      {title && (
        <div className={styles.header}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <h2 className={styles.title}>{title}</h2>
        </div>
      )}

      {/* children is whatever you put inside <Card>...</Card> */}
      <div className={styles.body}>
        {children}
      </div>

    </div>
  )
}

export default Card