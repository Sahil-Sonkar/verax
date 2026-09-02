import type { ProtocolId } from './clock'

export type Protocol = {
  title: string
  lines: string[]
}

export const PROTOCOLS: Record<ProtocolId, Protocol> = {
  push1: {
    title: 'Push · Week 1',
    lines: [
      'Push-ups — 2 × 15',
      'Barbell bench press — 3 × 10',
      'Cable standing fly — 3 × 12',
      'Weighted tricep dips — 3 × 10',
      'Tricep pushdown — 3 × 12',
      'Overhead tricep extension — 3 × 12',
      'Lying leg raise — 3 × 20',
      'Running on Treadmill — 10 min',
    ],
  },
  push2: {
    title: 'Push · Week 2',
    lines: [
      'Push-ups — 2 × 15',
      'Dumbbell Incline Bench Press — 3 × 12',
      'Lever Pec Deck Fly — 3 × 12',
      'Lever Seated Shoulder Press — 3 × 12',
      'Diamond Push-up — 2 × 10',
      'One-Arm Side Tricep Pushdown — 3 × 12',
      'Lever Total Abdominal Crunch — 3 × 14',
      'Seated Neck Extension — 3 × 12',
      'Running on Treadmill — 10 min',
    ],
  },
  swim: {
    title: 'Swimming',
    lines: [
      '5–10 min easy warm-up',
      '4 × 50 m moderate',
      '4 × 100 m moderate',
      '2 × 50 m harder',
      'Easy cooldown',
      'Progress distance and intensity gradually.',
    ],
  },
  pull1: {
    title: 'Pull · Week 1',
    lines: [
      'Assisted pull-ups — 2 × 8',
      'Cable Seated Lats focused Row — 3 × 12',
      'Bar Lateral Pull Down — 3 × 12',
      'Bent Over Row — 3 × 12',
      'Hammer Curl — 3 × 10',
      'Cable One Arm Lateral Raise — 3 × 12',
      'Lever Seated Reverse Fly — 3 × 12',
      'Abs Wheel Rollout — 3 × 10',
    ],
  },
  pull2: {
    title: 'Pull · Week 2',
    lines: [
      'Assisted pull-ups — 2 × 8',
      'Deadlift — 3 × 10',
      'Cable straight arm pulldown — 3 × 12',
      '45 degree hyperextension — 3 × 12',
      'Cable Standing Face Pull (with rope) — 3 × 12',
      'Dumbbell Incline Biceps Curl — 3 × 12',
      'Shrug — 3 × 12',
      'Decline Crunch — 3 × 12',
    ],
  },
  boxing: {
    title: 'Boxing',
    lines: [
      'Technique',
      'Footwork',
      'Combinations',
      'Pads / bag',
      'Conditioning',
      'Defense',
      'Coordination',
      'Not max intensity every session.',
    ],
  },
  legs1: {
    title: 'Legs · Week 1',
    lines: [
      'Normal Squat — 2 × 20',
      'Lever Leg Extension — 3 × 12',
      'Dumbbell Lunges — 3 × 10',
      'Barbell Squat — 3 × 10',
      'Lever Seated Leg Curl — 3 × 12',
      'Lever Seated Calf Raise — 3 × 12',
      'Hanging Oblique Knee Raise — 3 × 15',
      'Walk Elliptical Cross Trainer — 7 min',
    ],
  },
  legs2: {
    title: 'Legs · Week 2',
    lines: [
      'Normal Squat — 2 × 20',
      'Barbell Squat — 3 × 10',
      'Lever Seated Leg Curl — 3 × 12',
      'Sled 45 Leg Press — 3 × 12',
      'Lever Hip Thrust — 3 × 12',
      'Lever Standing Calf Raise — 3 × 12',
      'Alternate Heel Touches — 3 × 20',
      'Incline Walk on Treadmill — 20 min',
    ],
  },
  yoga: {
    title: 'Yoga',
    lines: ['Mobility', 'Flexibility', 'Breathing', 'Recovery', 'Relaxation'],
  },
  oatmeal: {
    title: 'Oatmeal',
    lines: [
      '250 ml milk',
      '40 g oats',
      '5 raisins, 5 almonds, 5 cashews, 5 pistachios',
      '1 date, 2 figs, 2 walnuts',
      '10 g pumpkin seeds, 5 g flax, 5 g chia',
      'Vit D 600 IU × 4, multivitamin, Omega-3',
    ],
  },
  lunch: {
    title: 'Lunch',
    lines: [
      '150 g chicken breast',
      '2 whole eggs',
      '50 g tomato, onion, potato',
      '100 g Greek yogurt',
      'Minimal sauce / masala / oil',
      'Walk after · Omega-3 × 1',
    ],
  },
  dinner: {
    title: 'Dinner base',
    lines: [
      '3 egg whites',
      '100 g spinach',
      '100 g cabbage',
      '50 g avocado',
      'Flex protein / carbs to the day’s targets.',
    ],
  },
  shutdown: {
    title: 'Shutdown',
    lines: [
      'Magnesium glycinate × 2',
      'Ashwagandha 500 mg',
      'Journal or draw (3 questions)',
      'Iron clothes',
      'Beard minoxidil',
      'Phone away',
      'Call home',
      'Logic puzzle / chess',
      'Kegels',
    ],
  },
  voicePlan: {
    title: 'Voice plan',
    lines: [
      'Review content bank',
      'Choose this week’s idea',
      'Rough hook',
      'What needs filming',
      'Hook / story / 3–5 points / ending / shots',
      'Keep it simple.',
    ],
  },
  organise: {
    title: 'Saturday organise',
    lines: [
      'Wash clothes, bathroom, plants, shop food',
      'Room, almirah, drawer',
      'Nails / haircut / trim as needed',
      'Backups: contacts, password manager, Drive, photos, chats',
      'Digital: apps, albums, SMS, notes, machines',
      'Expenses / Splitwise',
    ],
  },
  playMenu: {
    title: 'Pick one (or a few). Do not miss the rest.',
    lines: [
      'Movie / series',
      'Paint or sketch',
      'Football, trek, bike, badminton, bowling',
      'Board games, short trip, massage',
      'Exhibition, theater, seminar — if the point is the day',
    ],
  },
  sit: { title: 'Sit', lines: ['15 minutes. Phone away.'] },
  deepWork: {
    title: 'Deep work',
    lines: ['Coding, Jira, hard problems, architecture.', 'Create before consume.', 'Americano at 12:00 is not a tick.'],
  },
  career: {
    title: 'Career block',
    lines: ['70% current job', '20% future skill', '10% experiment'],
  },
  journal3: {
    title: 'Three questions',
    lines: ['What went well?', 'What could I improve?', 'What is tomorrow’s #1?'],
  },
  moneyFirst: {
    title: '1st of month',
    lines: [
      'Invest: IN 35 · US 30 · Crypto 5 · Gilt 15 · Gold 10 · PPF 5',
      'Budget: rent, maintenance, wifi, cook, maid, water, electric, home transfer, CCs, loans, mobile, subs',
    ],
  },
  hygiene: {
    title: 'Hygiene (no passwords in the app)',
    lines: ['Breach glance on your three inboxes', 'Rotate device, mail, bank, social, code logins in your manager'],
  },
}
