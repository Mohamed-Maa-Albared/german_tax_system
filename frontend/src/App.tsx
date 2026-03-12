import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AdminPanel from './pages/AdminPanel'
import LandingPage from './pages/LandingPage'
import Results from './pages/Results'
import TaxWizard from './pages/TaxWizard'

export default function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/wizard" element={<TaxWizard />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    )
}
