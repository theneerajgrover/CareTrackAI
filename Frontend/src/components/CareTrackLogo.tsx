import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'

interface CareTrackLogoProps {
  onClick?: () => void
  variant?: 'light' | 'dark'
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
  clickable?: boolean
  className?: string
}

export default function CareTrackLogo({
  onClick,
  variant = 'light',
  subtitle,
  size = 'md',
  clickable = true,
  className = '',
}: CareTrackLogoProps) {
  const isDark = variant === 'dark'

  const sizeClasses = {
    sm: { box: 'w-6 h-6 rounded-md', icon: 12, text: 'text-[13px]', sub: 'text-[9.5px]' },
    md: { box: 'w-7 h-7 rounded-lg', icon: 14, text: 'text-[14.5px]', sub: 'text-[10.5px]' },
    lg: { box: 'w-10 h-10 rounded-xl', icon: 20, text: 'text-[18px]', sub: 'text-[12px]' },
  }[size]

  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Purple circular/rounded container with Activity heartbeat icon */}
      <div
        className={`${sizeClasses.box} bg-accent flex items-center justify-center shadow-md shadow-accent/25 flex-shrink-0`}
        style={{ background: 'linear-gradient(135deg, #4338CA, #6366F1)' }}
      >
        <Activity size={sizeClasses.icon} className="text-white" strokeWidth={2.5} />
      </div>

      <div className="flex flex-col text-left">
        <span
          className={`font-bold ${sizeClasses.text} tracking-tight leading-tight whitespace-nowrap ${
            isDark ? 'text-white' : 'text-foreground'
          }`}
        >
          CareTrack <span className={isDark ? 'text-[#818CF8]' : 'text-accent'}>AI</span>
        </span>
        {subtitle && (
          <span
            className={`font-medium ${sizeClasses.sub} uppercase tracking-wider leading-none mt-0.5 ${
              isDark ? 'text-white/45' : 'text-muted-foreground'
            }`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )

  if (clickable && onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        className="flex items-center text-left bg-transparent border-0 p-0 cursor-pointer outline-none focus:outline-none select-none"
        whileHover={{ opacity: 0.85 }}
        whileTap={{ scale: 0.97 }}
      >
        {content}
      </motion.button>
    )
  }

  return content
}
