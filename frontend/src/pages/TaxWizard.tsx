import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ProgressBar from '../components/ProgressBar'
import { fetchActiveParameters } from '../lib/api'
import { useWizardStore } from '../lib/store'

// Step components
import Deductions from '../components/wizard/steps/Deductions'
import EmploymentIncome from '../components/wizard/steps/EmploymentIncome'
import OtherIncome from '../components/wizard/steps/OtherIncome'
import PersonalDetails from '../components/wizard/steps/PersonalDetails'
import Review from '../components/wizard/steps/Review'
import SpecialExpenses from '../components/wizard/steps/SpecialExpenses'

export default function TaxWizard() {
    const navigate = useNavigate()
    const {
        currentStep,
        nextStep,
        prevStep,
        markStepComplete,
        setTaxParams,
        runCalculation,
        results,
        reset,
    } = useWizardStore()

    // Load tax parameters from backend on mount (falls back to hardcoded defaults on failure)
    useEffect(() => {
        fetchActiveParameters()
            .then((params) => setTaxParams(params))
            .catch(() => {
                // Keep DEFAULT_PARAMS_2026 — graceful degradation
            })
    }, [setTaxParams])

    const handleNext = () => {
        markStepComplete(currentStep)
        nextStep()
    }

    const handleBack = () => {
        prevStep()
    }

    const handleCalculate = async () => {
        await runCalculation()
        navigate('/results')
    }

    const handleStartFresh = () => {
        reset()
    }

    const stepProps = {
        onNext: handleNext,
        onBack: handleBack,
    }

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return <PersonalDetails {...stepProps} />
            case 1:
                return <EmploymentIncome {...stepProps} />
            case 2:
                return <OtherIncome {...stepProps} />
            case 3:
                return <Deductions {...stepProps} />
            case 4:
                return <SpecialExpenses {...stepProps} />
            case 5:
                return <Review onBack={handleBack} onCalculate={handleCalculate} />
        }
    }

    return (
        <Layout>
            <div className="min-h-screen bg-slate-50 py-8">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-2xl font-bold text-brand-500">Tax Return Calculator</h1>
                            {results && (
                                <button
                                    onClick={() => navigate('/results')}
                                    className="text-sm text-brand-400 hover:text-brand-600 font-medium underline underline-offset-2"
                                >
                                    View My Results
                                </button>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm">
                            For the 2026 filing year (covering income earned in 2025)
                        </p>
                    </div>

                    {/* Progress */}
                    <ProgressBar />

                    {/* Step content */}
                    <div className="mt-6">
                        {renderStep()}
                    </div>

                    {/* Start fresh link */}
                    {currentStep > 0 && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={handleStartFresh}
                                className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                            >
                                Start over / clear all data
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}
