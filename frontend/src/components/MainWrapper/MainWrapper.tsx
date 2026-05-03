import { Routes, Route, Navigate } from 'react-router-dom'
import BlobPage from '../../pages/BlobPage'

const MainWrapper = () => {
  return (
    <main id="main-content" className="main-content z">
      <Routes>
        <Route path="/" element={<BlobPage type="page" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  )
}

export default MainWrapper
