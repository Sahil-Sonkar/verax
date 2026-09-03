import {
  BookOpen,
  Brain,
  Droplet,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Heart,
  Moon,
  Pill,
  Sparkles,
  Sun,
} from 'lucide'

type HabitGlyph = typeof Moon

const ICONS: Record<string, HabitGlyph> = {
  moon: Moon,
  droplet: Droplet,
  footprints: Footprints,
  book: BookOpen,
  pill: Pill,
  dumbbell: Dumbbell,
  lotus: Flower2,
  sparkles: Sparkles,
  flame: Flame,
  brain: Brain,
  heart: Heart,
  sun: Sun,
}

export const HABIT_ICON_PICKER = Object.keys(ICONS)

export function habitIcon(name?: string | null): HabitGlyph {
  if (!name) return Sparkles
  return ICONS[name.toLowerCase()] ?? Sparkles
}
