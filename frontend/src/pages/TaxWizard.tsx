import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import Deductions from '../components/wizard/Deductions'
import EmploymentIncome from '../components/wizard/EmploymentIncome'
import OtherIncome from '../components/wizard/OtherIncome'
import PersonalDetails from '../components/wizard/PersonalDetails'
import Review from '../components/wizard/Review'
import SpecialExpenses from '../components/wizard/SpecialExpenses'
import { fetchActiveParameters } from '../lib/api'
import { useTaxStore } from '../lib/store'

export default function TaxWizard() {
    const navigate = useNavigate()
    const { currentStep, setCurrentStep, setTaxParams, runCalculation } = useTaxStore()

    useEffect(() => {
        fetchActiveParameters()
            .then(setTaxParams)
            .catch(() => {/* use DEFAULT_PARAMS_2026 already in store */ })
    }, [setTaxParams])

    function handleNext() {
        setCurrentStep(currentStep + 1)
    }

    function handleBack() {
        setCurrentStep(currentStep - 1)
    }

    function handleCalculate() {
        runCalculation()
        navigate('/results')
    }

    return (
        <div className="max-w-2xl mx-auto">
            <ProgressBar currentStep={currentStep} />

            <div className="bg-white dark:bg-sn-card rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-sm dark:shadow-none">
                {currentStep === 0 && <PersonalDetails onNext={handleNext} />}
                {currentStep === 1 && <EmploymentIncome onNext={handleNext} onBack={handleBack} />}
                {currentStep === 2 && <OtherIncome onNext={handleNext} onBack={handleBack} />}
                {currentStep === 3 && <Deductions onNext={handleNext} onBack={handleBack} />}
                {currentStep === 4 && <SpecialExpenses onNext={handleNext} onBack={handleBack} />}
                {currentStep === 5 && <Review onSubmit={handleCalculate} onBack={handleBack} />}
            </div>
        </div>
    )
}
