import { cn } from '../lib/cn'

type Props = {
  className?: string
  variant?: 'icon' | 'badge'
}

export function BeatStudioLogo({ className, variant = 'badge' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {variant === 'badge' ? <rect width="64" height="64" rx="14" fill="#f3ebe0" /> : null}
      <ellipse cx="28" cy="36" rx="22" ry="16" fill="#e9b45d" />
      <ellipse cx="28" cy="36" rx="18" ry="12.5" fill="#f2cc7a" />
      <path
        d="M10 36c6-10 18-14 28-8 10 6 12 16 4 20-8 4-18-2-22-12"
        stroke="#b87a2e"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 38c4-6 12-8 20-4 8 4 9 11 3 14-6 3-14-1-17-10"
        stroke="#d49a48"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
      <circle cx="47.5" cy="43" r="2.75" fill="#2a211c" />
      <path d="M50.25 43V24" stroke="#2a211c" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M50.25 24h6v8.5c-3.8 1.2-5.5-0.8-5.5-3.8V24z" fill="#2a211c" />
    </svg>
  )
}
