import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ADMIN_PATH } from './config'
import { AdminPage } from './pages/AdminPage'
import { PublicPage } from './pages/PublicPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicPage />} />
        <Route path="/horarios" element={<PublicPage />} />
        <Route path={ADMIN_PATH} element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
