import React from 'react'
import { cn } from '@/lib/utils'

interface TrustJugglerLogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
  markOnly?: boolean
  showTagline?: boolean
  taglineClassName?: string
}

export const TrustJugglerLogo: React.FC<TrustJugglerLogoProps> = ({
  size = 32,
  showWordmark = true,
  className,
  markOnly = false,
  showTagline = false,
  taglineClassName,
}) => {
  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      {/* Delivery Verify Vector Mark (Isometric Courier Package + Verification Shield & Checkmark) */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform group-hover:scale-105 duration-200"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tj-verify-grad" x1="9.5" y1="11" x2="22.5" y2="27.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F3B2C" />
            <stop offset="1" stopColor="#164E3B" />
          </linearGradient>
        </defs>

        {/* Isometric Courier Delivery Parcel - Top Lid */}
        <path
          d="M16 3L27 8.5L16 14L5 8.5Z"
          className="fill-primary/8 stroke-primary dark:stroke-emerald-400"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Courier Parcel Sealing Tape */}
        <path
          d="M16 3V14"
          stroke="#84CC16"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Courier Delivery Package Walls */}
        <path
          d="M5 8.5V20.5L16 26.5L27 20.5V8.5"
          className="stroke-primary dark:stroke-emerald-400"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Subtle Parcel Center Fold */}
        <path
          d="M16 14V26.5"
          className="stroke-primary/30 dark:stroke-emerald-400/30"
          strokeWidth="1.2"
          strokeDasharray="1.5 1.5"
        />

        {/* Verification Security Shield Badge on Package */}
        <path
          d="M16 11L22.5 14.2V19.2C22.5 23.2 19.6 26.2 16 27.5C12.4 26.2 9.5 23.2 9.5 19.2V14.2L16 11Z"
          fill="url(#tj-verify-grad)"
          stroke="#84CC16"
          strokeWidth="1.8"
          strokeLinejoin="round"
          className="dark:fill-[#0F3124]"
        />

        {/* Real-Time Authenticated Verification Checkmark */}
        <path
          d="M13 19.2L15.2 21.4L19.2 16.5"
          stroke="#84CC16"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Balanced Wordmark without extra tagline clutter */}
      {showWordmark && !markOnly && (
        showTagline ? (
          <div className="flex flex-col text-left leading-tight">
            <span className="font-bold text-[15px] sm:text-base tracking-tight text-foreground font-sans">
              Trust Juggler
            </span>
            <span
              className={cn(
                'text-[11px] text-muted-foreground font-normal font-sans tracking-normal mt-0.5',
                taglineClassName
              )}
            >
              Trust the rider. Check the pattern.
            </span>
          </div>
        ) : (
          <span className="font-bold text-base sm:text-[17px] tracking-tight text-foreground font-sans">
            Trust Juggler
          </span>
        )
      )}
    </div>
  )
}
