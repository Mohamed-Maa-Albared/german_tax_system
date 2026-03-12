import { cn } from '../lib/utils'

const STEPS = [
    'Personal',
    'Employment',
    'Other Income',
    'Deductions',
    'Expenses',
    'Review',
    'Results',
]

interface ProgressBarProps {
    currentStep: number
    completedSteps: Set<number>
}

export default function ProgressBar({ currentStep, completedSteps }: ProgressBarProps) {
    const progress = Math.round((currentStep / (STEPS.length - 1)) * 100)

    return (
        <div className="w-full">
            {/* Percentage bar */}
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-4">
                <div
                    className="h-full bg-accent-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Step indicators — hidden on small screens, shown on md+ */}
            <div className="hidden md:flex items-center justify-between">
                {STEPS.map((label, idx) => {
                    const isCompleted = completedSteps.has(idx)
                    const isActive = idx === currentStep
                    const isPast = idx < currentStep

                    return (
                        <div key={idx} className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200',
                                    isActive && 'bg-brand-500 border-brand-500 text-white scale-110 shadow-md',
                                    isPast && 'bg-brand-500 border-brand-500 text-white',
                                    !isActive && !isPast && 'bg-white border-slate-300 text-slate-400'
                                )}
                            >
                                {isPast ? '✓' : idx + 1}
                            </div>
                            <span
                                className={cn(
                                    'text-xs font-medium transition-colors',
                                    isActive ? 'text-brand-600' : isPast ? 'text-brand-400' : 'text-slate-400'
                                )}
                            >
                                {label}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Mobile: just show step count + current name */}
            <div className="md:hidden flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                    Step {currentStep + 1} of {STEPS.length}
                </span>
                <span className="text-xs text-brand-600 font-semibold">{STEPS[currentStep]}</span>
            </div>
        </div>
    )
}
