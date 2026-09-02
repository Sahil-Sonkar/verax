import { MorphIcon } from 'morphicons/react'
import type { ComponentProps } from 'react'

export function Glyph(props: ComponentProps<typeof MorphIcon>) {
  return <MorphIcon reducedMotion="user" strokeWidth={1.5} {...props} />
}
