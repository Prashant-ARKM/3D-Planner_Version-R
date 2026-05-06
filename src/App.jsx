import { useState, useEffect } from 'react'
import Header from './components/Header'
import Card from './components/Card'
import UploadZone from './components/UploadZone'
import Viewer3D from './components/Viewer3D'
import { analyseFloorPlan } from './services/gemini'
import styles from './App.module.css'

const STAGES = ['Upload', 'Analyse', 'Render', 'Done']

function App() {
  const [isDark, setIsDark]             = useState(true)
  const [currentStage, setCurrentStage] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [floorData, setFloorData]       = useState(null)
  const [status, setStatus]             = useState('idle')
  const [errorMsg, setErrorMsg]         = useState(null)

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
    setFloorData(null)
    setStatus('idle')
    setErrorMsg(null)
    setCurrentStage(file ? 1 : 0)
  }

  async function handleProcess() {
    if (!selectedFile || currentStage !== 1) return
    setStatus('loading')
    setErrorMsg(null)
    setCurrentStage(2)

    try {
      const data = await analyseFloorPlan(selectedFile)
      setFloorData(data)
      setStatus('success')
      setCurrentStage(3)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
      setCurrentStage(1)
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

          {/* Floor Plan card */}
          <Card title="Floor Plan" icon="📐">
            <UploadZone onFileReady={handleFileReady} />
            {status === 'error' && (
              <div className={styles.errorBox}>⚠️ {errorMsg}</div>
            )}
            {selectedFile && currentStage === 1 && (
              <button className={styles.processBtn} onClick={handleProcess}>
                Analyse with Gemini →
              </button>
            )}
            {status === 'loading' && (
              <div className={styles.loadingBox}>
                <div className={styles.spinner} />
                <span>Gemini is reading your floor plan...</span>
              </div>
            )}
          </Card>

          {/* 3D Viewer — now live */}
          <Card title="3D Viewer" icon="🏗️" accent>
            <Viewer3D floorData={floorData} isDark={isDark} />
          </Card>

          {/* Materials panel */}
          <Card title="Materials & Analysis" icon="🔬">
            {floorData ? (
              <div className={styles.summaryBox}>
                <div className={styles.summaryStats}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{floorData.room_count}</span>
                    <span className={styles.statLabel}>Rooms</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{floorData.total_area_sqft}</span>
                    <span className={styles.statLabel}>Sq Ft</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{floorData.building_type}</span>
                    <span className={styles.statLabel}>Type</span>
                  </div>
                </div>
                <p className={styles.summaryText}>{floorData.summary}</p>
                <div className={styles.roomList}>
                  {floorData.rooms.map((room, i) => (
                    <div key={i} className={styles.roomTag}>{room.name}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.placeholder}>
                <span className={styles.placeholderIcon}>✨</span>
                <p>Upload and analyse a floor plan to see results</p>
              </div>
            )}
          </Card>

        </div>
      </main>
    </div>
  )
}

export default App