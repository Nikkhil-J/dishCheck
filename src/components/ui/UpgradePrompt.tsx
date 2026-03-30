import { Button } from './Button'

interface UpgradePromptProps {
  onUpgrade?: () => void
}

const PREMIUM_FEATURES = [
  'Advanced dish filters (cuisine, area, price range)',
  'Side-by-side dish comparison',
  'Priority review visibility',
  'Early access to new features',
]

export function UpgradePrompt({ onUpgrade }: UpgradePromptProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <div className="text-3xl">⭐</div>
      <div>
        <h3 className="text-base font-semibold text-gray-900">Premium Feature</h3>
        <p className="mt-1 text-sm text-gray-500">Upgrade to unlock this and more:</p>
      </div>
      <ul className="w-full space-y-2 text-left">
        {PREMIUM_FEATURES.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="h-4 w-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Button variant="primary" size="md" onClick={onUpgrade} className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-amber-400">
        Upgrade to Premium
      </Button>
    </div>
  )
}
