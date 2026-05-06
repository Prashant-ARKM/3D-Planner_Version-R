import { useState } from 'react'
import styles from './MaterialsPanel.module.css'

// Icon for each building element
const ELEMENT_ICONS = {
  'Foundation':     '🏗️',
  'Exterior Walls': '🧱',
  'Interior Walls': '🪟',
  'Flooring':       '🪵',
  'Roof':           '🏠',
  'Doors':          '🚪',
  'Windows':        '🔲',
  'Plumbing':       '🔧',
  'Electrical':     '⚡',
}

function getIcon(element) {
  for (const [key, icon] of Object.entries(ELEMENT_ICONS)) {
    if (element.toLowerCase().includes(key.toLowerCase())) return icon
  }
  return '🔩'
}

function DotIndicator({ value, max = 3, color }) {
  return (
    <div className={styles.dots}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={styles.dot}
          style={{
            background: i < value ? color : 'var(--surface2)',
            border: `1.5px solid ${i < value ? color : 'var(--border)'}`
          }}
        />
      ))}
    </div>
  )
}

function MaterialsPanel({ floorData }) {
  const [selected, setSelected] = useState(null)

  if (!floorData) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🧱</span>
        <p>Upload and analyse a floor plan to see material recommendations</p>
      </div>
    )
  }

  const { materials, room_count, total_area_sqft, building_type, summary } = floorData
  const active = materials?.[selected]

  return (
    <div className={styles.wrapper}>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{room_count}</span>
          <span className={styles.statLabel}>Rooms</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{total_area_sqft}</span>
          <span className={styles.statLabel}>Sq Ft</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{building_type}</span>
          <span className={styles.statLabel}>Type</span>
        </div>
      </div>

      {/* Summary */}
      <p className={styles.summary}>{summary}</p>

      {/* Element buttons */}
      {materials && materials.length > 0 && (
        <>
          <p className={styles.hint}>Select a building element to see material details</p>

          <div className={styles.buttonGrid}>
            {materials.map((item, i) => (
              <button
                key={i}
                className={`${styles.elementBtn} ${selected === i ? styles.elementBtnActive : ''}`}
                onClick={() => setSelected(selected === i ? null : i)}
              >
                <span className={styles.btnIcon}>{getIcon(item.element)}</span>
                <span className={styles.btnLabel}>{item.element}</span>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {active && (
            <div className={styles.detail}>

              <div className={styles.detailHeader}>
                <div className={styles.detailTitle}>
                  <span className={styles.detailIcon}>{getIcon(active.element)}</span>
                  <div>
                    <div className={styles.detailElement}>{active.element}</div>
                    <div className={styles.detailMaterial}>{active.material}</div>
                  </div>
                </div>
                <div className={styles.detailIndicators}>
                  <div className={styles.indicatorRow}>
                    <span className={styles.indicatorLabel}>Cost</span>
                    <DotIndicator value={active.cost} color="var(--accent2)" />
                  </div>
                  <div className={styles.indicatorRow}>
                    <span className={styles.indicatorLabel}>Durability</span>
                    <DotIndicator value={active.durability} color="var(--success)" />
                  </div>
                </div>
              </div>

              <div className={styles.detailCost}>💰 {active.approx_cost}</div>

              <p className={styles.detailReasoning}>{active.reasoning}</p>

              <div className={styles.detailAlt}>
                <span className={styles.altLabel}>Alternatives considered</span>
                <span className={styles.altText}>{active.alternatives}</span>
              </div>

            </div>
          )}
        </>
      )}

    </div>
  )
}

export default MaterialsPanel