import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AdminPanel from './pages/AdminPanel'
import FilingInstructions from './pages/FilingInstructions'
import LandingPage from './pages/LandingPage'
import Results from './pages/Results'
import SteuerbescheidReader from './pages/SteuerbescheidReader'
import TaxAdvisor from './pages/TaxAdvisor'
import TaxWizard from './pages/TaxWizard'

export default function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/wizard" element={<TaxWizard />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/filing" element={<FilingInstructions />} />
                    <Route path="/advisor" element={<TaxAdvisor />} />
                    <Route path="/steuerbescheid" element={<SteuerbescheidReader />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    )
}
