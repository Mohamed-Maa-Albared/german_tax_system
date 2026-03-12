import { cn } from '../lib/utils'

const STEPS = [
    'Personal',
    'Employment',
    'Other Income',
    'Deductions',
    'Special Expenses',
    'Review',
]

interface ProgressBarProps {
    currentStep: number
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
    return (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between relative">
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10" />
                <div
                    className="absolute top-4 left-0 h-0.5 bg-brand-500 -z-10 transition-all duration-300"
                    style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                />
                {STEPS.map((step, idx) => (
                    <div key={step} className="flex flex-col items-center gap-1">
                        <div
                            className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                                idx < currentStep
                                    ? 'bg-brand-600 border-brand-600 text-white'
                                    : idx === currentStep
                                        ? 'bg-white border-brand-600 text-brand-600'
                                        : 'bg-white border-gray-300 text-gray-400',
                            )}
                        >
                            {idx < currentStep ? '✓' : idx + 1}
                        </div>
                        <span
                            className={cn(
                                'text-xs hidden sm:block',
                                idx === currentStep ? 'text-brand-600 font-medium' : 'text-gray-400',
                            )}
                        >
                            {step}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
