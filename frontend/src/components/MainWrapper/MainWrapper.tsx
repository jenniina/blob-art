import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const BlobPage = lazy(() => import('../../pages/BlobPage'))
const UserEditPage = lazy(() => import('../../pages/UserEditPage'))

const MainWrapper = () => {
  return (
    <main id="main-content" className="main-content z">
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<BlobPage type="page" />} />
          <Route path="/edit" element={<UserEditPage type="page" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </main>
  )
}

export default MainWrapper
