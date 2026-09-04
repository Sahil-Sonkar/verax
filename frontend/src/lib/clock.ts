import { TONE } from './colors'

export const ASPECTS = ['Body', 'Mind', 'Work', 'Voice', 'Money', 'People', 'Place', 'Play'] as const
export type Aspect = (typeof ASPECTS)[number]

export const ASPECT_COLORS: Record<Aspect, string> = {
  Body: TONE.mint,
  Mind: TONE.violet,
  Work: TONE.sky,
  Voice: TONE.pink,
  Money: TONE.brass,
  People: TONE.pink,
  Place: TONE.violet,
  Play: TONE.brass,
}

export type Energy = 'BUILD' | 'CONNECT' | 'EXPLORE' | 'RECOVER' | 'RESET'

export function energyForIsoWeekday(iso: number): Energy {
  if (iso === 1 || iso === 2) return 'BUILD'
  if (iso === 3 || iso === 5) return 'CONNECT'
  if (iso === 6) return 'EXPLORE'
  if (iso === 4) return 'RECOVER'
  return 'RESET'
}

export function zonedNow(timeZone: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '0'
  const year = Number(read('year'))
  const month = Number(read('month'))
  const day = Number(read('day'))
  const hour = Number(read('hour'))
  const minute = Number(read('minute'))
  const weekday = read('weekday')
  const isoMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return {
    year,
    month,
    day,
    hour,
    minute,
    isoWeekday: isoMap[weekday] ?? 1,
    minutes: hour * 60 + minute,
    dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  }
}

export function isoWeekNumber(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day))
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function liftWeek(year: number, month: number, day: number): 1 | 2 {
  return isoWeekNumber(year, month, day) % 2 === 1 ? 1 : 2
}

export function parseHm(hm: string) {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}

export type ProtocolId =
  | 'push1'
  | 'push2'
  | 'swim'
  | 'pull1'
  | 'pull2'
  | 'boxing'
  | 'legs1'
  | 'legs2'
  | 'yoga'
  | 'oatmeal'
  | 'lunch'
  | 'dinner'
  | 'shutdown'
  | 'voicePlan'
  | 'organise'
  | 'playMenu'
  | 'sit'
  | 'deepWork'
  | 'career'
  | 'journal3'
  | 'moneyFirst'
  | 'hygiene'

export type CheckDef = {
  id: string
  label: string
  match: string[]
}

export type BlockDef = {
  id: string
  start: string
  end?: string
  aspect: Aspect
  title: string
  subtitle?: string
  checks: CheckDef[]
  protocol?: ProtocolId
}

export type BlockState = 'now' | 'next' | 'later' | 'past'

export function blocksForDay(opts: {
  isoWeekday: number
  liftWeek: 1 | 2
  isFirstOfMonth: boolean
  isLastSunday: boolean
}): BlockDef[] {
  const { isoWeekday: d, liftWeek: w, isFirstOfMonth, isLastSunday } = opts
  const weekend = d >= 6
  const blocks: BlockDef[] = []

  blocks.push({
    id: 'wake',
    start: '06:00',
    end: '06:20',
    aspect: 'Body',
    title: 'Wake',
    subtitle: 'Freshen, ACV + water, banana',
    checks: [{ id: 'wake', label: 'Wake', match: ['wake'] }],
  })

  const hairOil = d === 3 || d === 6
  blocks.push({
    id: 'hair',
    start: '06:00',
    end: '06:20',
    aspect: 'Body',
    title: 'Hair',
    subtitle: hairOil ? 'Oil' : 'Rosemary + rice-water spray',
    checks: [{ id: 'hair', label: 'Hair', match: ['hair'] }],
  })

  if (d === 4) {
    blocks.push({
      id: 'session',
      start: '06:20',
      end: '07:30',
      aspect: 'Voice',
      title: 'Plan (30 min)',
      subtitle: 'No structured training',
      protocol: 'voicePlan',
      checks: [{ id: 'voice-plan', label: 'Voice plan', match: ['voice plan', 'content creation'] }],
    })
  } else {
    const session =
      d === 1
        ? { title: `Training · Push · Week ${w}`, protocol: (`push${w}` as ProtocolId), match: ['training', 'exercise'] }
        : d === 2
          ? { title: 'Training · Swimming', protocol: 'swim' as ProtocolId, match: ['training', 'exercise', 'swim'] }
          : d === 3
            ? { title: `Training · Pull · Week ${w}`, protocol: (`pull${w}` as ProtocolId), match: ['training', 'exercise'] }
            : d === 5
              ? { title: 'Training · Boxing', protocol: 'boxing' as ProtocolId, match: ['boxing', 'training'] }
              : d === 6
                ? { title: `Training · Legs · Week ${w}`, protocol: (`legs${w}` as ProtocolId), match: ['training', 'exercise'] }
                : { title: 'Training · Yoga', protocol: 'yoga' as ProtocolId, match: ['training', 'yoga', 'exercise'] }
    blocks.push({
      id: 'session',
      start: '06:20',
      end: '07:30',
      aspect: 'Body',
      title: session.title,
      subtitle: d === 5 ? 'Technique, not max every time' : 'Open sheet for the lifts',
      protocol: session.protocol,
      checks: [
        { id: 'training', label: 'Training', match: session.match },
        { id: 'gym-water', label: '~1 L water in session', match: ['gym water'] },
      ],
    })
  }

  const protein = d !== 4 && d !== 7
  const wash = d === 3 ? 'Shreekesha wash' : d === 6 ? 'Detoxie wash' : undefined
  blocks.push({
    id: 'post',
    start: '07:30',
    end: '08:00',
    aspect: 'Body',
    title: protein ? 'Post-workout' : 'Get ready',
    subtitle: protein
      ? `Protein + creatine + shower${wash ? ` · ${wash}` : ''}`
      : `Shower + get ready${wash ? ` · ${wash}` : ''}`,
    checks: [{ id: 'post', label: protein ? 'Post-workout' : 'Get ready', match: ['post-workout', 'post workout'] }],
  })

  blocks.push({
    id: 'skin',
    start: '08:00',
    end: '08:15',
    aspect: 'Body',
    title: 'Skin + scalp',
    subtitle: 'Minoxidil + finasteride · facewash · moisturiser · sunscreen',
    checks: [{ id: 'skin', label: 'Skin + scalp', match: ['skin', 'minoxidil', 'hair / health'] }],
  })

  blocks.push({
    id: 'sit',
    start: '08:15',
    end: '08:30',
    aspect: 'Mind',
    title: d === 7 ? 'Sit + pray' : 'Sit',
    subtitle: '15 minutes',
    protocol: 'sit',
    checks: [{ id: 'sit', label: 'Meditation', match: ['meditation'] }],
  })

  blocks.push({
    id: 'breakfast',
    start: '08:45',
    end: '09:10',
    aspect: 'Body',
    title: 'Breakfast',
    subtitle: d === 7 ? 'Oatmeal + Vit D ×4, multi, Omega-3 ×2' : 'Oatmeal + Vit D ×4, multi, Omega-3',
    protocol: 'oatmeal',
    checks: [
      { id: 'breakfast', label: 'Breakfast', match: ['breakfast', 'oatmeal'] },
      { id: 'supplements', label: 'Morning supplements', match: ['supplements'] },
    ],
  })

  blocks.push({
    id: 'sun',
    start: '09:10',
    end: '09:40',
    aspect: 'Mind',
    title: 'Sun + read',
    subtitle: 'Light is Body. Reading is Mind. No mindless scrolling.',
    checks: [
      { id: 'sun', label: 'Sunlight', match: ['sunlight', 'sun'] },
      { id: 'read', label: 'Read', match: ['reading'] },
    ],
  })

  if (!weekend) {
    blocks.push({
      id: 'deep',
      start: '09:40',
      end: '13:00',
      aspect: 'Work',
      title: 'Deep work',
      subtitle: 'Engineering. Create before consume. Coffee 12:00 is a timestamp, not a tick.',
      protocol: 'deepWork',
      checks: [{ id: 'deep', label: 'Deep work', match: ['deep work', '2 hours'] }],
    })
  } else if (d === 6) {
    blocks.push({
      id: 'toastmasters',
      start: '09:30',
      end: '10:30',
      aspect: 'Voice',
      title: 'Toastmasters',
      checks: [{ id: 'toastmasters', label: 'Toastmasters', match: ['toastmasters'] }],
    })
    blocks.push({
      id: 'organise',
      start: '10:30',
      end: '13:30',
      aspect: 'Place',
      title: 'Organise',
      subtitle: 'House, backups, digital, shop',
      protocol: 'organise',
      checks: [
        { id: 'organise', label: 'Organise', match: ['organise', 'organize'] },
        { id: 'expenses', label: 'Expenses / Splitwise', match: ['expenses', 'splitwise'] },
      ],
    })
  } else {
    blocks.push({
      id: 'produce',
      start: '09:40',
      end: '13:00',
      aspect: 'Voice',
      title: 'Production',
      subtitle: 'Film · edit · schedule',
      checks: [
        { id: 'film', label: 'Film (batch)', match: ['film', 'youtube', 'content creation'] },
        { id: 'produce', label: 'Produce', match: ['produce', 'edit'] },
        { id: 'schedule', label: 'Schedule', match: ['schedule'] },
      ],
    })
  }

  if (isFirstOfMonth) {
    blocks.push({
      id: 'money-first',
      start: weekend ? '08:50' : '13:50',
      end: weekend ? '09:10' : '14:00',
      aspect: 'Money',
      title: '1st · Invest + budget',
      protocol: 'moneyFirst',
      checks: [{ id: 'invest', label: 'Invest + budget pass', match: ['invest'] }],
    })
    blocks.push({
      id: 'hygiene',
      start: weekend ? '09:00' : '13:55',
      end: weekend ? '09:10' : '14:00',
      aspect: 'Place',
      title: '1st · Account hygiene',
      subtitle: 'Checklist only. Never store passwords here.',
      protocol: 'hygiene',
      checks: [{ id: 'hygiene', label: 'Account hygiene', match: ['hygiene', 'password'] }],
    })
  }

  if (!weekend) {
    blocks.push({
      id: 'lunch',
      start: '13:00',
      end: '14:00',
      aspect: 'Body',
      title: 'Lunch',
      subtitle: 'Plate + walk + Omega-3',
      protocol: 'lunch',
      checks: [{ id: 'lunch', label: 'Lunch', match: ['lunch'] }],
    })
    blocks.push({
      id: 'career',
      start: '14:00',
      end: '19:00',
      aspect: 'Work',
      title: 'Career',
      subtitle: '70% job · 20% skill · 10% experiment',
      protocol: 'career',
      checks: [{ id: 'career', label: 'Career block', match: ['career'] }],
    })
  } else if (d === 6) {
    blocks.push({
      id: 'music',
      start: '14:00',
      end: '15:00',
      aspect: 'Play',
      title: 'Music class · HSR',
      checks: [{ id: 'music', label: 'Music class', match: ['music'] }],
    })
    blocks.push({
      id: 'explore',
      start: '15:00',
      end: '19:00',
      aspect: 'People',
      title: 'Explore / people',
      subtitle: 'Events, friends, dating, Bangalore',
      checks: [{ id: 'explore', label: 'Explore / people', match: ['explore'] }],
    })
  } else {
    blocks.push({
      id: 'play',
      start: '13:00',
      end: '20:00',
      aspect: 'Play',
      title: 'Play',
      subtitle: 'Pick from the menu. Do not tick every option.',
      protocol: 'playMenu',
      checks: [{ id: 'play', label: 'Play', match: ['play'] }],
    })
  }

  blocks.push({
    id: 'dinner',
    start: d === 7 ? '20:00' : '19:00',
    end: d === 7 ? '20:30' : '20:00',
    aspect: 'Body',
    title: 'Dinner',
    subtitle: 'Cook + plate. Flex to calorie / protein targets.',
    protocol: 'dinner',
    checks: [{ id: 'dinner', label: 'Dinner', match: ['dinner'] }],
  })

  if (d === 1 || d === 2) {
    blocks.push({
      id: 'life',
      start: '20:00',
      end: '21:00',
      aspect: 'Body',
      title: 'Walk',
      subtitle: '7,500+ steps',
      checks: [{ id: 'steps', label: '7,500+ steps', match: ['step', '7,000', '7,500'] }],
    })
  } else if (d === 3 || d === 5) {
    blocks.push({
      id: 'life',
      start: '20:00',
      end: '21:00',
      aspect: 'People',
      title: 'People / Play',
      subtitle: 'Date, friends, family, event, networking',
      checks: [{ id: 'people', label: 'People evening', match: ['people', 'date'] }],
    })
  } else if (d === 4) {
    blocks.push({
      id: 'life',
      start: '20:00',
      end: '21:00',
      aspect: 'Play',
      title: 'Easy evening',
      subtitle: 'Walk / rest. Recover.',
      checks: [{ id: 'easy', label: 'Easy evening', match: ['step', '7,000', 'rest'] }],
    })
  } else if (d === 7) {
    if (isLastSunday) {
      blocks.push({
        id: 'voice-review',
        start: '19:30',
        end: '20:00',
        aspect: 'Voice',
        title: 'Monthly review',
        subtitle: '45–60 min · attention, connection, authority, opportunity, consistency',
        checks: [{ id: 'voice-review', label: 'Voice monthly review', match: ['monthly review'] }],
      })
    }
    blocks.push({
      id: 'life',
      start: '20:00',
      end: '20:30',
      aspect: 'Body',
      title: 'Walk',
      subtitle: '7,500+ steps',
      checks: [{ id: 'steps', label: '7,500+ steps', match: ['step', '7,000', '7,500'] }],
    })
    blocks.push({
      id: 'engage',
      start: '20:00',
      end: '20:30',
      aspect: 'Voice',
      title: 'Engagement',
      subtitle: '30 min. Not a scroll.',
      checks: [{ id: 'engage', label: 'Voice engagement', match: ['engagement'] }],
    })
  }

  blocks.push({
    id: 'shutdown',
    start: d === 7 ? '20:30' : '21:00',
    end: '21:30',
    aspect: 'Mind',
    title: 'Shutdown',
    subtitle: 'Score as one close. Sleep first if you are late.',
    protocol: 'shutdown',
    checks: [
      { id: 'shutdown', label: 'Shutdown', match: ['shutdown'] },
      { id: 'journal', label: 'Journal or draw', match: ['journal'] },
      { id: 'call-home', label: 'Call home', match: ['call home'] },
    ],
  })

  blocks.push({
    id: 'sleep',
    start: '21:30',
    end: '06:00',
    aspect: 'Body',
    title: 'Sleep',
    subtitle: '8+ hours. Wake 06:00.',
    checks: [{ id: 'sleep', label: 'Sleep', match: ['sleep'] }],
  })

  return blocks
}

export function blockState(block: BlockDef, nowMin: number, ordered: BlockDef[]): BlockState {
  const start = parseHm(block.start)
  const end = block.end ? parseHm(block.end) : start + 30
  const sleepLike = block.id === 'sleep'
  if (sleepLike) {
    if (nowMin >= start || nowMin < 5 * 60) return 'now'
    return nowMin < start ? 'later' : 'past'
  }
  if (nowMin >= start && nowMin < end) return 'now'
  if (nowMin >= end) return 'past'
  const upcoming = ordered.filter((row) => parseHm(row.start) > nowMin && row.id !== 'sleep')
  upcoming.sort((a, b) => parseHm(a.start) - parseHm(b.start))
  if (upcoming[0]?.id === block.id) return 'next'
  return 'later'
}
