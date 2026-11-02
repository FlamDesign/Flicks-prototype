import { LazyMotion, MotionConfig, domAnimation, m } from "motion/react"

/** The app's motion timing (matches --ease-out / --dur-slow in index.css). */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Motion for the whole app: the small animation feature set, and still when the user prefers less motion. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: EASE_OUT }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}

/**
 * A row that eases in when it first appears (a chat message, a result) and slides when the rows
 * around it change, instead of jumping.
 */
export function Arrive({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <m.div layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={className}>
      {children}
    </m.div>
  )
}
