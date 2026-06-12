import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LandingPage from './pages/LandingPage'
import ToolPage from './pages/ToolPage'
import DatenschutzPage from './pages/DatenschutzPage'
import MapPage from './pages/MapPage'
import SurveyPage from './pages/SurveyPage'
import AdminPage from './pages/AdminPage'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tool" element={<ToolPage />} />
        <Route path="/datenschutz" element={<DatenschutzPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/survey/:surveyId" element={<SurveyPage />} />
        <Route path="/admin/:surveyId" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
