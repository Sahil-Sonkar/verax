# Verax

A personal operating system for one life, built as **separate rooms in one app**.

Verax answers:

> Am I consistently becoming the person I want to become?

It is not a generic habit tracker. The primary metric is **consistency**, not productivity.

Core loop: **Plan → Do → Track → Analyze → Improve**

## Now building — five rooms

Home is a hub. Analytics that cross rooms land there in the next iteration. Each room below has its own record and its own charts.

| Room | Route | What it is |
|---|---|---|
| **Routine** | `/routine` | Minimal week clock. Seven days. Sectograph. Time blocks. Subtasks can be weekday-scoped (shampoo Mon/Wed only). |
| **Fuel** | `/fuel` | Meals with kcal / P / C / F. USDA + Open Food Facts. Saved recipes. Daily supplements (taken / servings — not Medicines). Water. Daily + weekly + monthly charts. `/recipe` redirects here. |
| **Train** | `/train` | Push/pull/leg days as startable routines with a live timer, sets × reps × kg (or time). Volume trend, muscle radar, recovery since last session. Swimming / running / badminton / boxing (and anything you add) as Garmin-shaped activities. |
| **Finance** | `/finance` | Invest, Budget (the Excel workbook), Accounts, Loans, Portfolio (net worth + month flow), Tax plan (old vs new regime). |
| **Mind** | `/mind` | Meditation timer, generated ambients (rain / wind / sea / static / fire), sleep stages + score with day / month / quarter / year charts. |

Garmin Connect is partner-only. Sleep and sport land as the same fields Garmin shows; you paste or type them. Do not scrape. Food keys stay on the API (`USDA_API_KEY`, default `DEMO_KEY`). Quotes for stocks/crypto go through the API, not the browser.

The rest of this file is the **parked life inventory** (eight aspects, weekday clock, Voice, Place hygiene). It is not the sidebar.

- Life model, week, and aspect inventories: below
- Today (legacy clock): [docs/today.md](docs/today.md)
- Scoring and API: [docs/architecture.md](docs/architecture.md)
- How to run the repo: [Part 4](#part-4--the-product)

Do not optimize one day. Build a life that can run for years. Sleep wins over a lower-priority tick. Don’t chase perfection. Chase consistency.

The Voice rule: **do not build a content life. Build a great life and document it.**

## Run, deploy, iPhone

| | |
|---|---|
| **Local** | Postgres 16, Java 21 API on **8081**, Vite on **5173**. [Full steps](#48-run-locally). |
| **Demo login** | `demo@verax.app` / `verax-demo` |
| **Production** | Web on [Vercel](https://vercel.com). API + data on [Fly.io](https://fly.io) (`verax-sonkar-api`). `/api` is proxied so the site is one origin. |
| **Updates** | Push `main`. Vercel rebuilds the PWA. Open the home-screen icon; it fetches the new HTML and hashed assets. |
| **iPhone** | Safari → Share → **Add to Home Screen**. Same login. Tokens last 30 days. |

Live data for `demo@verax.app` is restored onto Fly Postgres from a local dump (the dump file is gitignored). Seed does not run in production (`VERAX_SEED=false`).

---

## Contents

1. [Part 1 — The model](#part-1--the-model)
   - [Aspects](#11-aspects)
   - [Weekly energy](#12-weekly-energy)
   - [Classification rules](#13-classification-rules)
   - [Names we dropped](#14-names-we-dropped)
2. [Part 2 — How a week runs](#part-2--how-a-week-runs)
   - [Weekday clock (Mon–Fri)](#21-weekday-clock-monfri)
   - [Evening life block](#22-evening-life-block-20002100)
   - [Night shutdown](#23-night-shutdown-21002130)
   - [Saturday](#24-saturday-explore)
   - [Sunday](#25-sunday-recover--reset)
   - [1st of the month](#26-1st-of-the-month)
   - [Last Sunday of the month](#27-last-sunday-of-the-month)
   - [Every quarter](#28-every-quarter)
3. [Part 3 — Aspect inventories](#part-3--aspect-inventories)
   - [Body](#31-body)
   - [Mind](#32-mind)
   - [Work](#33-work)
   - [Voice](#34-voice)
   - [Money](#35-money)
   - [People](#36-people)
   - [Place](#37-place)
   - [Play](#38-play)
4. [Part 4 — The product](#part-4--the-product)
   - [Run locally](#48-run-locally)
   - [Deploy](#49-deploy)

---

# Part 1 — The model

Two systems. Do not mix them.

- **Aspects** are rooms in the sidebar. Each is an object you can point at.
- **Weekly energy** colors the day (Build, Connect, Explore, Recover). It is not a ninth room.

Home, Today, and Profile are not aspects. Today is the clock. Home is the score. Profile is you.

## 1.1 Aspects

Eight objects. Not moods. Not time horizons. Not “why.”

| # | Aspect | Object | Never includes |
|---|---|---|---|
| 1 | **Body** | The organism | Mood, money, audience |
| 2 | **Mind** | Inner life | Career output |
| 3 | **Work** | What you build in private | Audience, rupees |
| 4 | **Voice** | What you put in public | The product itself |
| 5 | **Money** | The ledger | Why you earn |
| 6 | **People** | Specific humans | Audience, bills |
| 7 | **Place** | Rooms, cities, digital house | Work done in the room |
| 8 | **Play** | Recovery and joy that is not training-as-duty | Boxing-as-protocol |

## 1.2 Weekly energy

**Build → Connect → Explore → Recover**

| Day | Energy | How the day is weighted |
|---|---|---|
| Monday | **BUILD** | Body + Work get the best hours |
| Tuesday | **BUILD** | Same |
| Wednesday | **CONNECT** | People and Voice in the evening; training still happens |
| Thursday | **RECOVER** | No structured training; light Voice planning; no heroics |
| Friday | **CONNECT** | Boxing is Body. Evening is People |
| Saturday | **EXPLORE** | Legs + Toastmasters + Place reset + Play |
| Sunday | **RECOVER + RESET** | Yoga, Voice production, Play, monthly Money on the 1st |

## 1.3 Classification rules

1. One object, one aspect. Papa’s transfer is Money. Calling Papa is People.
2. A recipe is one meal, not twelve habits.
3. A training *session* is one habit. The push / pull / legs sheets live *inside* Body.
4. Filming the gym is Voice. The lift is Body.
5. Music class is Play (joy / skill). A Reel of the class is Voice.
6. Ironing clothes is the shutdown ritual (Mind) *and* a house task (Place). Score it once, on shutdown.
7. Emails, banks, and password lists are Place hygiene. They are never navigation and never stored as secrets in the app.
8. Long missions (university, movie, book) sit in a room until they are a production. They are not a ninth aspect.
9. If it has a periodization sheet, it is Body. If it is joy without a protocol, it is Play.
10. Seminar / volunteer / conference: Play if the point is the day; People if the point is the human; Voice if you publish it.
11. Purchases (DSLR, GoPro, guitar, keyboard, cars) are Money when you pay. Use of those things is Play or Voice.
12. Clothes in / out is Place (the drawer) and Body (the organism). Toothbrush / towel / underwear: organism care is Body; stocking the drawer is Place.
13. Goodreads / IMDb reviews: the *review* is Voice-adjacent; the *housekeeping of media* can stay in Saturday Place organise.
14. Coffee at 12:00 is a timestamp in the workday, not a scored life habit.
15. Saturday and Sunday overwrite the weekday Work clock (Toastmasters, organise, content, Play).

## 1.4 Names we dropped

From earlier drafts, on purpose:

| Dropped | Why |
|---|---|
| Health | Folded into Body |
| Growth | A motive, not a room |
| Social | Split into People + Voice |
| Spirit | Folded into Mind (meditation stays in Mind) |
| Wealth | Renamed Money so it cannot mean “a better life” |
| Legacy | A time horizon; missions sit inside rooms |
| Career / Content / Appearance / Learning / Personal / Finance / Relationships / Other | Old app tags. Do not treat them as the life model |

The running product still uses those old ten tags as habit colors. This README is the target map. The UI has not been rebuilt around the eight aspects yet. Default new-account categories in code are still the old ten.

---

# Part 2 — How a week runs

Read this part to live the day. Part 3 is the catalog (recipes, workout sheets, content doctrine, checklists).

## 2.1 Weekday clock (Mon–Fri)

Thursday morning training is rest: that 06:20–07:30 slot is Voice planning (30 min), not Body. Deep work and career blocks still run on Thursday.

| Time | Block | Aspect | What happens |
|---|---|---|---|
| 06:00 | Wake | Body | Wake, freshen, brush, 15 ml ACV + 250 ml water, 100 g banana |
| 06:00 | Hair | Body | Wed + Sat: oil. Other days: rosemary + rice-water spray |
| 06:20–07:30 | Training | Body | Mon Push, Tue Swim, Wed Pull, Thu rest, Fri Boxing. Week 1 / Week 2 alternate on lift days |
| During gym | Water | Body | ~1 L. ORS / electrolytes only when needed |
| 07:30 | Post-workout | Body | 1 scoop MuscleBlaze Biozyme Iso-Zero, creatine 3–5 g, shower, get ready |
| 07:30 | Hair wash | Body | Wed: Pureus Herbals Shreekesha 10 Herbs (shampoo + conditioner). Sat: Detoxie shampoo |
| 08:00 | Skin + scalp | Body | 5% minoxidil + 0.1% finasteride on scalp. Facewash + moisturiser + sunscreen |
| 08:15–08:30 | Sit | Mind | 15 min meditation |
| 08:45 | Breakfast + prep | Body | Oatmeal bowl + morning supplements. Cook lunch on days that need it |
| 09:10–09:40 | Sun + read | Body + Mind | Sit in sunlight (Body). Read a book, no mindless scrolling (Mind) |
| 09:40–13:00 | Deep work | Work | Engineering. Create before consume |
| 12:00 | Coffee | Work | 180 ml Americano |
| 13:00 | Lunch | Body | Plate + walk + Omega-3 |
| 14:00–19:00 | Career | Work | 70% job / 20% future skill / 10% experiment |
| All day | Water | Body | See water below |
| 19:00–20:00 | Cook + dinner | Body | Dinner base; flex protein / carbs to daily targets |
| 20:00–21:00 | Life block | People / Play / Body | [§ 2.2](#22-evening-life-block-20002100) |
| 21:00–21:30 | Shutdown | several | [§ 2.3](#23-night-shutdown-21002130) |
| 21:30 | Sleep | Body | Target 8+ hours. Wake 06:00. Protect sleep before sacrificing lower-priority habits |

### Water (every day)

- Morning ACV: 250 ml
- With protein: ~700 ml
- Office target: ~2.1 L (empty the bottle 3 times)
- With meals: ~250 ml
- Daily floor: **more than 3 L**
- Adjust for weather, exercise, thirst

### Steps (every day)

- Daily overall target **7,500+**
- Dedicated walk block Mon, Tue, and often Thu / Sun evening
- Training days still count toward the floor

## 2.2 Evening life block (20:00–21:00)

| Day | Energy | What you do | Aspects |
|---|---|---|---|
| Monday | Build | Walk toward **7,500+** steps | Body |
| Tuesday | Build | Walk toward **7,500+** steps | Body |
| Wednesday | Connect | Date, friends, family, event, networking, new experience, hobby | People + Play |
| Thursday | Recover | Walk / relaxed evening. Rest day | Body + Play |
| Friday | Connect | Date, friends, event, dinner, networking, new experience | People + Play |
| Saturday | Explore | Events, friends, dating, exploring Bangalore, new experiences (after music) | People + Play |
| Sunday | Recover | Family / friends / relaxation / personal time. Also the 13:00–20:00 Play menu | People + Play |

## 2.3 Night shutdown (21:00–21:30)

Non-negotiable. Score as **one Mind shutdown** with children, or as separate ticks. Then sleep at 21:30.

| Tick | Aspect |
|---|---|
| Magnesium glycinate ×2 | Body |
| Ashwagandha 500 mg | Body |
| Journal **or** draw (three questions below) | Mind |
| Iron clothes for tomorrow | Place / Mind (score once, on shutdown) |
| Beard minoxidil | Body |
| Phone away | Mind |
| Call home | People |
| Logic puzzle / chess | Mind |
| Kegels | Body |

Journal questions:

1. What went well today?
2. What could I improve?
3. What is tomorrow’s #1 priority?

Drawing counts as the night mind block. Sleep before a missed journal.

## 2.4 Saturday (EXPLORE)

| Time | Block | Aspects |
|---|---|---|
| 06:00–09:00 | Morning routine + Legs | Body, Mind |
| 09:30–10:30 | Toastmasters | Voice |
| 10:30–13:30 | Organise (house, backups, digital, body-groom, shop, reviews, expenses) | Place, Money, Body |
| 14:00 | Music class — HSR | Play |
| After music | Events / friends / dating / exploring / adventure | People, Play |
| 21:00–21:30 | Shutdown | Mind, Body, People, Place |
| 21:30 | Sleep | Body |

Hair wash this day: Detoxie shampoo. Hair oil: Wednesday + Saturday.

## 2.5 Sunday (RECOVER + RESET)

| Time | Block | Aspects |
|---|---|---|
| 06:00 | Wake | Body |
| 06:20–07:30 | Yoga | Body |
| 08:00 | Ready + scalp minoxidil / finasteride (Man Matters note) | Body |
| 08:15 | Meditate 15 min + pray | Mind |
| 08:45 | Oatmeal, cook lunch, eat, Vit D ×4, multivitamin, Omega-3 ×2 | Body |
| 09:10 | Sunlight + read | Body, Mind |
| 09:40–13:00 | Content block (film / produce / schedule) | Voice |
| 13:00–20:00 | Play menu | Play, People |
| 20:00 | Dinner + walk, 7,500 steps | Body |
| 20:00–20:30 | Voice engagement + review (30 min, not a scroll) | Voice |
| 20:30 | Shutdown | Mind, Body, People, Place |
| 21:30 | Sleep | Body |

Sunday 09:40–13:00 overwrites weekday deep work. Sunday 13:00–20:00 overwrites the career block.

## 2.6 1st of the month

Do these even if the 1st is a workday. Details under [Money](#35-money) and [Place](#37-place).

- **Money:** invest to the allocation, then a full budget pass
- **Place:** account-breach glance + password rotation (checklist only; never store passwords in Verax)

## 2.7 Last Sunday of the month

Add Voice monthly review (45–60 min). If Money + Place hygiene was not done on the 1st, close it here.

## 2.8 Every quarter

- Full body checkup (Body)
- Dentist / doctor if needed (Body)
- New toothbrush, towel, underwear (Body organism + Place drawer)
- Buy new clothes and donate / sell old ones (Place)

---

# Part 3 — Aspect inventories

Each room: what it is, the ticks, then protocols (sheets, recipes, doctrine), then goals.

## 3.1 Body

The organism. Training as protocol lives here. Joy-sport and trips live in Play.

### Daily

- Wake 06:00
- Freshen + brush
- 15 ml apple cider vinegar + 250 ml water
- 100 g banana
- Hair (two modes, below)
- Training 06:20–07:30 except Thursday rest
- ~1 L water during gym; ORS / electrolytes only when needed
- Post-workout: protein scoop, creatine 3–5 g, shower, get ready
- 08:00: 5% minoxidil + 0.1% finasteride on scalp; facewash + moisturiser + sunscreen
- Oatmeal breakfast
- Morning supplements: Vitamin D 600 IU × 4, multivitamin × 1, Omega-3 × 1
- Sit outside 09:10–09:40 (the light is Body; reading is Mind)
- Lunch plate + walk + Omega-3 × 1
- Water > 3 L
- Cook dinner 19:00–20:00
- 7,500+ steps
- Night: magnesium glycinate × 2, ashwagandha 500 mg, beard minoxidil, kegels
- Sleep 21:30–06:00, **8+ hours**

Sunday extras: pray sits with meditation (Mind). Sunday morning supplements include Omega-3 × 2 with the oatmeal / lunch cook. Sunday evening walk still hits 7,500 steps.

### Hair

- **Wednesday + Saturday:** oil hair
- **Other days:** rosemary + rice-water spray
- **Wednesday wash:** Pureus Herbals Shreekesha 10 Herbs in 1 (hibiscus, jatamansi, henna; sulfate / paraben free; anti hair fall, growth, scalp) + conditioner
- **Saturday wash:** Detoxie shampoo
- Scalp: 5% minoxidil + 0.1% finasteride (Man Matters on the Sunday note)

### Training week (one habit, plan inside)

Most lift sets ~1–3 reps from failure. Prioritize quality and progressive overload over junk volume. Do not make every boxing session maximal intensity. Progress swim distance / intensity gradually.

| Day | Session | Notes |
|---|---|---|
| Monday | Push | Week 1 and Week 2 alternate |
| Tuesday | Swimming | Cardio. Warm-up, intervals, cooldown |
| Wednesday | Pull | Week 1 and Week 2 alternate |
| Thursday | Rest | No structured training. 06:20–07:30 is Voice planning |
| Friday | Boxing | Technique, footwork, combinations, pads / bag, conditioning, defense, coordination |
| Saturday | Legs | Week 1 and Week 2 alternate |
| Sunday | Yoga | Mobility, flexibility, breathing, recovery, relaxation. 06:20–07:30 |

#### Monday Push — Week 1

- Push-ups — 2 × 15
- Barbell bench press — 3 × 10
- Cable standing fly — 3 × 12
- Weighted tricep dips — 3 × 10
- Tricep pushdown — 3 × 12
- Overhead tricep extension — 3 × 12
- Lying leg raise — 3 × 20
- Treadmill — 10 min

#### Monday Push — Week 2

- Push-ups — 2 × 15
- Dumbbell incline bench press — 3 × 12
- Lever pec deck fly — 3 × 12
- Lever seated shoulder press — 3 × 12
- Diamond push-up — 2 × 10
- One-arm side tricep pushdown — 3 × 12
- Lever total abdominal crunch — 3 × 14
- Seated neck extension — 3 × 12
- Treadmill — 10 min

#### Tuesday swimming

- 5–10 min easy warm-up
- 4 × 50 m moderate
- 4 × 100 m moderate
- 2 × 50 m harder
- Easy cooldown

#### Wednesday Pull — Week 1

- Assisted pull-ups — 2 × 8
- Cable seated lats-focused row — 3 × 12
- Bar lat pulldown — 3 × 12
- Bent-over row — 3 × 12
- Hammer curl — 3 × 10
- Cable one-arm lateral raise — 3 × 12
- Lever seated reverse fly — 3 × 12
- Abs wheel rollout — 3 × 10

#### Wednesday Pull — Week 2

- Assisted pull-ups — 2 × 8
- Deadlift — 3 × 10
- Cable straight-arm pulldown — 3 × 12
- 45° hyperextension — 3 × 12
- Cable standing face pull (rope) — 3 × 12
- Dumbbell incline biceps curl — 3 × 12
- Shrug — 3 × 12
- Decline crunch — 3 × 12

#### Saturday Legs — Week 1

- Normal squat — 2 × 20
- Lever leg extension — 3 × 12
- Dumbbell lunges — 3 × 10
- Barbell squat — 3 × 10
- Lever seated leg curl — 3 × 12
- Lever seated calf raise — 3 × 12
- Hanging oblique knee raise — 3 × 15
- Elliptical — 7 min

#### Saturday Legs — Week 2

- Normal squat — 2 × 20
- Barbell squat — 3 × 10
- Lever seated leg curl — 3 × 12
- Sled 45° leg press — 3 × 12
- Lever hip thrust — 3 × 12
- Lever standing calf raise — 3 × 12
- Alternate heel touches — 3 × 20
- Incline treadmill walk — 20 min

#### Sunday yoga

Focus: mobility, flexibility, breathing, recovery, relaxation.

### Meals (one meal = one habit)

**Oatmeal (08:45)**

- 250 ml milk
- 40 g oats
- 5 raisins
- 5 almonds
- 5 cashews
- 1 date
- 10 g pumpkin seeds
- 5 g flax seeds
- 5 g chia seeds
- 2 figs
- 5 pistachios
- 2 walnuts

**Lunch**

- 150 g chicken breast
- 2 whole eggs
- 50 g tomato
- 50 g onion
- 50 g potato
- 100 g Greek yogurt
- Minimal sauces / masala / olive oil
- Walk after lunch
- Omega-3 — 1 tablet

**Dinner base (19:00–20:00)**

- 3 egg whites
- 100 g spinach
- 100 g cabbage
- 50 g avocado
- Adjust protein / carbohydrates to hit daily calorie + protein targets

**Post-workout**

- 1 scoop MuscleBlaze Biozyme Iso-Zero
- Creatine 3–5 g

### Quarterly

- Full body checkup
- Dentist / doctor if needed
- New toothbrush, towel, underwear (organism). Drawer stock is Place
- Clothes in / out shared with Place

### Goals

- Run a mile under 7:00
- Sprint 400 m under 1:15
- Sprint 100 m under 14 s
- Back squat 1.5× bodyweight
- Deadlift 2× bodyweight
- 15 consecutive pull-ups
- 40 consecutive push-ups
- Learn Brazilian jiu-jitsu (skill protocol, not a holiday)

### Metrics (when the app tracks numbers)

- Weight, body fat, sleep hours, steps, water litres, training sessions

---

## 3.2 Mind

Inner life. Journal, sit, read, close the day. Meditation stays here (not a separate Spirit room).

### Daily

- **08:15–08:30:** 15 minutes meditation
- **Sunday:** meditate and pray
- **09:10–09:40:** read a book in sunlight. No mindless scrolling
- **21:00:** journal or draw (three questions in [§ 2.3](#23-night-shutdown-21002130))
- Phone away
- Logical puzzle / chess
- Iron clothes for tomorrow (shutdown tick; also Place)

### Rules

- Don’t chase perfection. Chase consistency.
- Sleep before a missed journal.
- Drawing counts as the night mind block.

---

## 3.3 Work

Private production. Job excellence and skill. Audience is Voice.

Saturday and Sunday overwrite this clock (Toastmasters, organise, content, Play).

### Weekday deep work — 09:40–13:00

Primary focus: **engineering**

- Coding
- Jira
- Difficult technical problems
- Architecture / design
- High-impact work

**Rule:** create before consuming.

### Coffee

- 12:00 — 180 ml Americano (anchor in the workday, not a life score)

### Career development — 14:00–19:00

Rotate:

- Technology learning
- AI / emerging technology
- System design
- Documentation
- Test cases
- Production issues
- PR reviews
- Engineering quality
- Personal development (job-adjacent)

**70% current job excellence · 20% future skills · 10% experimentation**

### Coding goals

- Complete 150 Blind-style LeetCode
- 37 design patterns · 51 LLD · 20 HLD
- Complete 450 Striver sheet

### Learning goals (certifications = Work)

- Claude AI certification
- AWS Cloud Practitioner
- AWS Developer Associate

### Long missions that start in Work

- Build a tech company
- Build a university (institution; not a weekend task)

---

## 3.4 Voice

Public expression. YouTube, Reels, LinkedIn, Toastmasters. Life is the raw material. Content must not eat the life.

### Positioning

> I’m building an exceptional life at 30 — while figuring it out in public.

Four pillars the brand *talks about* (story, not sidebar rooms):

| Story pillar | Maps to aspect |
|---|---|
| **Build** — exceptional at technology | Work |
| **Body** — strong, athletic, healthy | Body |
| **Grow** — better thinker and communicator | Mind + Voice |
| **Live** — relationships, experiences, meaning | People + Play |

### Flywheel

Real life → experience → lesson → YouTube → Instagram (personality) + LinkedIn (credibility) → audience → opportunities → better life → more stories → repeat.

### Schedule

**Thursday 06:20–07:30 (rest morning, 30 min)**

- Review content bank
- Choose the week’s idea
- Write a rough hook
- Decide what needs filming
- Prepare: hook, story, 3–5 key points, ending, shots needed
- Keep it simple

**Saturday 09:30–10:30**

- Toastmasters

**Sunday 09:40–13:00 — production**

Hour 1 — film:

- Batch. Do not film one video every week if you can batch
- When possible: 1 main YouTube + several short clips in the same session

Hour 2 — production:

- Start YouTube edit
- Cut Reels
- Thumbnails
- Captions

Hour 3 — finish + schedule:

- Finish YouTube edit
- Edit Reels
- Schedule Instagram
- Draft LinkedIn posts

**Sunday ~20:00 — 30 min engagement**

- Reply to comments
- Reply to meaningful DMs
- Engage with relevant creators
- Check analytics
- Record useful observations
- Do **not** spend the evening scrolling

### Weekly output (good to have, not mandatory)

| Platform | Target |
|---|---|
| YouTube | 0.5 video / week |
| Instagram | 3 Reels / week |
| LinkedIn | 2 posts / week |

### Weekly content calendar

| Day | YouTube | Instagram | LinkedIn |
|---|---|---|---|
| Monday | — | Reel | — |
| Tuesday | Plan | — | Post |
| Wednesday | — | Reel | — |
| Thursday | Script | — | Post |
| Friday | — | Reel | — |
| Saturday | Film | Stories | — |
| Sunday | Edit | — | Engagement |

### Content bank (one permanent note)

Whenever something interesting happens, log:

- **IDEA**
- What happened
- What I learned
- Potential platform
- Potential hook

Example: boxing after years of lifting → “I thought I was fit until I tried boxing.” Platforms: YouTube + Instagram.

### Priority score (1–6)

1. Interesting — would someone care?
2. Personal — genuine story?
3. Useful — does the audience learn?
4. Visual — can it be shown?
5. Transformation — before / after or experiment?
6. You — does it strengthen identity?

- **6/6** — make it
- **4–5/6** — consider
- **&lt;4** — probably don’t

### 70 / 20 / 10 content mix

- **70%** core (aligned with the four story pillars)
- **20%** experiments (boxing, music, AI tool, travel, challenge)
- **10%** wildcard (genuine excitement)

This prevents the account from becoming repetitive.

### Production rules

1. Life comes first. Never cancel sleep, gym, work, relationships, or important experiences to make content. The life is the content source.
2. Batch. Saturday + Sunday. Do not edit every night.
3. Capture, don’t manufacture. Carry the phone. Gym, meals, coding, walks, Toastmasters, boxing, music, volunteering, events. You do not need to constantly stage your life.
4. One idea, multiple outputs. Never “I need an Instagram idea.” Ask “what am I doing that is interesting?” Then distribute it.
5. Don’t chase every trend. Story + insight + personality over trending sounds. The brand should still make sense in five years.

### Monthly review (last Sunday, 45–60 min)

**YouTube:** views, watch time, average retention, subscribers, which topics worked  
**Instagram:** reach, saves, shares, followers, which Reels brought new people  
**LinkedIn:** impressions, engagement, profile views, meaningful conversations, opportunities generated  

### Primary metrics (not follower count)

- **Attention** — are people watching?
- **Connection** — comments / saves / shares?
- **Authority** — are interesting people discovering you?
- **Opportunity** — conversations, collabs, jobs, startup intros, invitations, friendships?
- **Consistency** — did you actually execute the system?

### First 90 days

| Month | Goal |
|---|---|
| 1 | Build the system. Consistency. 2 YouTube, 8–12 Reels, 8 LinkedIn. Establish filming / editing workflow. Don’t worry about growth |
| 2 | Find your voice. Experiment: educational, storytelling, documentary, talking-head, vlogs, experiments. Identify what feels natural |
| 3 | Double down. From the data: top 3 topics, top 3 formats, top 3 hooks. Then make more of them |

---

## 3.5 Money

The ledger. Family *transfers* live here. Family *presence* is People.

### 1st of every month — invest

| Sleeve | Percent |
|---|---|
| Indian stocks | 35% |
| US stocks | 30% |
| Crypto | 5% |
| Gilt funds | 15% |
| Gold | 10% |
| PPF | 5% |

### 1st of every month — budget pass

- Rent
- Maintenance
- Wifi
- Cook
- Maid
- Water bill
- Electric bill
- Home transfer (Papa / Mummy rupees)
- Credit cards
- Loan repayment
- Mobile recharge
- Subscriptions: Google One, Amazon Prime, Zomato Pro, Netflix, Hotstar, Cursor

The Invest page workbook is the working sheet (Sep–Dec 2026 seeded from the Excel: housing, family support, domestic help, utilities, subscriptions, loans, credit cards, buffer, salary, bonus, due receive, totals, running balance). Blank stays blank. Zero stays zero. Running balance is 0 in the first month, then adds each later month surplus.

### Saturday organise (Money slice)

- Expenses
- Splitwise
- Budget glance if the week slipped

### Goals

- Emergency fund of ₹10 lakh
- Buy 100 g gold
- Buy 1 kg silver
- House in Varanasi
- SUV for family
- Sedan for personal use

Purchases (DSLR, GoPro, guitar, keyboard) are Money when you pay. Use of those things is Play or Voice.

---

## 3.6 People

Specific humans. Not the audience. Not the EMI.

### Daily

- **21:00:** call home

### Evenings

- **Wednesday / Friday:** date, friends, family, event, networking, new experience
- **Saturday after music:** events, friends, dating, exploring with people
- **Sunday:** family, friends, relaxation, personal time

### Also People (the humans; filming them is Voice)

- Volunteer
- Seminar, tech conference
- Networking as relationship, not as a content slot

---

## 3.7 Place

Bangalore room, Howrah house, digital house. Two physical homes already exist in the budget; Place is the walk-through, not the rupee.

### Daily

- Iron tomorrow’s clothes (shared with Mind shutdown)
- Tiny room reset if needed

### Saturday organise — 10:30–13:30

This is the main Place block of the week.

**House**

- Wash clothes
- Clean bathroom
- Water plants
- Shop food
- Room, almirah, drawer
- Cut nails
- Haircut / body-hair trim as needed
- Write review of book / movie on Goodreads / IMDb

**Backups**

- Contacts
- Passwords (manager, not the app)
- Google Drive
- Photos
- WhatsApp chats
- Messages

**Digital organise**

- Mobile apps
- Mobile photos
- Google Photos and albums
- Contacts
- SMS
- Keep / ideas
- Tasks / Todoist
- Google Drive
- Hard disk
- Windows folders and software
- Apple folders and software
- Bookmarks
- Evernote / OneNote
- Inboxes: `sahilsonkar.sahil713@gmail.com`, `sonkarsahil04@gmail.com`, `reborix2@proton.me`

### Monthly — 1st — account hygiene

Checklist only. Never store passwords in Verax.

**Breach glance**

- `sahilsonkar.sahil713@gmail.com`
- `sonkarsahil04@gmail.com`
- `reborux2@protonmail.com`

**Password rotation targets**

- Devices: Windows, Ubuntu, Apple, mobile
- Notes: Evernote / OneNote
- Commerce / media: Amazon, Netflix, Steam, Twitch
- Social: Instagram, Facebook, Twitter / X, Discord, Slack, LinkedIn, WhatsApp
- Mail: the two Gmails + office email
- Banks / cards: Kotak, Axis Bank, HDFC, SBI, American Express, ICICI, Scapia / Federal, PayPal, LIC
- Crypto: Binance, WazirX
- Code: GitHub, Bitbucket, GitLab
- Other: Garmin, Intermiles, IRCTC, ITR, MyFitnessPal

### Quarterly

- Buy new clothes and donate / sell old ones
- Replace toothbrush, towel, underwear (organism care is Body; stocking the drawer is Place)

---

## 3.8 Play

Joy that is not a training protocol. If it has a periodization sheet, it is Body.

### Saturday

- **14:00:** music class — HSR (piano / guitar / flute practice lives here)
- After music: events, friends, dating, exploring, adventure (shared with People)

### Sunday 13:00–20:00 menu (pick; do not do all)

- Movie
- Show / series
- Paint or sketch
- Edit photos and videos (for fun; scheduled content edit is Voice)
- Football
- Trek
- Bike ride
- Board games
- Badminton
- Short trip
- Bowling
- Hackathon (as play)
- Seminar / volunteer / exhibition / theater / tech conference
- Massage

### Horizon experiences

- Surfing in Mulki
- Kashmir (skiing)
- Horse riding
- Scuba in Andaman
- Skydiving in Dubai

### Horizon skills (joy / identity, not the day job)

- Private pilot license
- Piano, guitar, flute
- Languages: Bangla, Bhojpuri, Kannada, Marwari, German, Japanese, Chinese, Spanish

### Horizon making (parked in Play until they are a production)

- Write a book
- Make a movie

### Gear to buy (pay in Money, use in Play / Voice)

- DSLR
- GoPro
- Guitar
- Piano keyboard

---

# Part 4 — The product

## 4.1 This life vs the running app

| This life | In the app now |
|---|---|
| Water > 3 L | Today water slider |
| Supplements | Nested habit stack |
| Meditation / reading | Focus timer on Today |
| Journal 3 questions | Journal page (fields are wider than the 3 questions) |
| Invest + budget | `/invest` workbook + holdings |
| Medicines | `/meds` + Today doses |
| Sleep / training / steps | Habits + optional pasted metrics |
| Weekday training sheets | Not in the app (one “Exercise” / “Boxing” habit) |
| Clock-based Today | `/today` follows the weekday clock (Now / Up next / Later). Thursday 06:20 is Voice plan, not training. |
| Place Saturday block | Not in the app |
| Call home | Not in the app |
| Voice calendar + content bank | Not in the app |
| 1st-of-month invest allocation + password checklist | Partial (invest habit + workbook; no allocation UI, no hygiene list) |
| 8-aspect sidebar | Parked. App nav is Home + Routine, Fuel, Train, Finance, Mind, Profile |

## 4.2 What you can do in the app today

| Area | In the app |
|---|---|
| **Auth** | Email and password, plus Google and Apple when client IDs are set. JWT, 7-day expiry. |
| **Home** (`/`) | Five room cards. Cross-room analytics next. |
| **Routine** (`/routine`) | Week as 7 days. Sectograph + time list. Add / edit / remove blocks. Subtasks with weekday chips. |
| **Fuel** (`/fuel`) | Food search (USDA / Open Food Facts), recipes, meal slots, supplements for the day, water, daily macros, stacked + line charts. |
| **Train** (`/train`) | Seeded push/pull/leg + cardio templates. Session timer. Sets. Radar, volume, recovery. Garmin-shaped activity log. |
| **Finance** (`/finance`) | Invest, Budget workbook, Accounts, Loans, Portfolio, Tax compare. `/invest` redirects here. |
| **Mind** (`/mind`) | Sit timer, ambient noise, sleep stages and score. |
| **Dashboard** (`/consistency`) | Quote, 30-day consistency, streaks, D3 radar, heatmap, weekly review (legacy). |
| **Today** (`/today`) | Legacy weekday clock. Unlinked from nav. |
| **Habits** (`/habits`) | Create, edit, archive, nest. Daily, weekday, weekly, or monthly. Optional metric auto-complete. |
| **Goals** (`/goals`) | Outcome with current / target / date. Archive. Milestones in API only. |
| **Analytics** (`/analytics`) | Trends, category / habit bars, compare, weekly review. |
| **Transformation** (`/transformation`) | Bounded mission. UI shows the first period. |
| **Journal** (`/journal`) | One entry per day. |
| **Medicines** (`/meds`) | Courses, times, weekdays. Today lists doses. |
| **Settings** (`/settings`) | Theme, connected-app catalog, paste a reading, metrics, photos, reminder prefs (no delivery), sign out. |

## 4.3 Scoring

Habits are process. Goals are outcomes. Metrics are numbers. They stay separate.

| Completion | Weight in the day |
|---|---|
| Done | 1.0 × habit weight |
| Partial | 0.5 × habit weight |
| Missed | 0, still in the denominator |
| Skipped | Excluded |

Habit weights: Critical 3, Important 2, Optional 1.

- A day counts toward a streak at **≥ 50%**. One miss does not collapse the stretch
- Unlogged **past** days count as missed. Unlogged **today** stays pending, so 7/10 reads as 70%
- Weekly habits (for example boxing 3× / week) only enter a day’s denominator when they are due, or when you log them that day
- A parent habit with children (the supplements stack) is a folder. Only the children count toward the score
- Habits, goals, and medicines are archived, never hard-deleted

Scoring formula and API map: [docs/architecture.md](docs/architecture.md).

## 4.4 Look

Chrome follows Instagram: white (or true black) surfaces, a script wordmark, a left rail on desktop, and a 5-icon tab bar on the phone. Primary actions use Instagram blue. Categories on the dashboard are snack chips in the Instagram palette (orange, magenta, gold, purple, blue). **Liquid Glass is gone.** Full-width main on desktop (no 630px feed cap).

Wordmark: **Verax**. Backend config key: `verax.app-name`.

## 4.5 Ingest

Opening Verax every day and tapping every habit is the fallback. A habit can auto-complete when a linked metric crosses a threshold (full at the threshold, partial at half). Link that on the Habits page.

| Source | Status |
|---|---|
| Google Fit / Health, Fitbit | Not live. Google Fit REST is shutting down. Paste steps or sleep hours in Settings → Connected apps. |
| Garmin | Partner-only API. Export sleep hours and paste them. |
| Zerodha | Official Kite Connect exists, but you register your own app. Verax will not take your password. Log invested capital until keys exist. |
| Banks | Do not scrape net banking. Legal path in India is RBI Account Aggregator. Log net worth as a metric. Until Verax is an FIU, log net worth as a metric. |
| Lyfta, Cult Fit | No public API. Log workout minutes after you train. |
| Meditation / reading | Built in. Timer on Today writes “Meditation minutes” or “Reading minutes” and can mark a habit done. |
| Medicines | Built in. List courses under Medicines; Today shows doses. |

Verax does not scrape Garmin, banks, Cult Fit, or Lyfta, and does not store those passwords.

## 4.6 What is not built yet

- Live Google Health OAuth, Garmin partner access, Kite Connect keys, Account Aggregator
- Correlation engine
- Real LLM coach (`InsightService` is heuristic copy on `/api/insights/preview`; dashboard already renders it)
- Google / Apple login until you set `GOOGLE_CLIENT_ID` and `APPLE_CLIENT_ID` (buttons are on the login page; they explain what is missing)
- Push / email / SMS delivery (preferences are stored)
- Goal-milestone editor, category manager, transformation creator in the UI
- Side-by-side photo compare, journal photos
- Profile PATCH (`GET /api/me` is used; timezone defaults to `Asia/Kolkata` at register)
- Redis (Compose starts a Redis container; the API does not use it)
- Eight-aspect sidebar, clock-based Today, weekday training sheets, Place Saturday block, Voice calendar, 1st-of-month allocation UI

## 4.7 Stack

| Layer | Choice |
|---|---|
| Web | React 19, TypeScript, Vite 8, Tailwind v4, React Router 7, TanStack Query, shadcn/ui, morphicons, Geist, Recharts (mono charts), lucide |
| API | Java 21, Spring Boot 3.4, Spring Security JWT, JPA, Flyway |
| Database | PostgreSQL 16 |
| Auth | Email / password + JWT. Google and Apple ID-token verify when client IDs are set |
| Photos | Local disk (`VERAX_UPLOAD_DIR`, default `backend/uploads/`) |
| Infra | Docker Compose, GitHub Actions (Java 21 tests, Node 22 frontend build) |

Schema lives in `backend/src/main/resources/db/migration/` (`V1` init, `V2`–`V6` category colors, `V3` habit auto-complete, medicines, focus sessions, `V4` OAuth columns, nested habits, holdings and monthly budget, `V7` budget workbook, `V8` recipe / routine / train / sleep / finance books).

## 4.8 Run locally

Needs **Java 21**, **Maven**, **Node 22**, and **PostgreSQL 16**.

```bash
createdb verax
```

If your Postgres user is not your OS username, copy `.env.example` and export `DATABASE_USER` / `DATABASE_PASSWORD`. Unset `DATABASE_USER` defaults to `$USER`. Password defaults to empty.

API (port **8081**, so it does not collide with other local apps on 8080):

```bash
cd backend
PORT=8081 mvn spring-boot:run
```

API: [http://localhost:8081](http://localhost:8081) · health: [http://localhost:8081/actuator/health](http://localhost:8081/actuator/health)

Web:

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

Vite proxies `/api` to `http://127.0.0.1:8081`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8081` | API port |
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/verax` | Postgres |
| `DATABASE_USER` | `$USER` | Postgres user |
| `DATABASE_PASSWORD` | empty | Postgres password |
| `VERAX_JWT_SECRET` | dev placeholder | Sign tokens; change in production |
| `VERAX_JWT_TTL` | `30d` | Session length (home-screen app) |
| `VERAX_CORS_ORIGINS` | empty | Extra allowed origins, comma-separated. `*.vercel.app` is always allowed |
| `VERAX_SEED` | `true` | Seed demo user when the user table is empty |
| `VERAX_UPLOAD_DIR` | `./uploads` | Progress photos |
| `GOOGLE_CLIENT_ID` | empty | Enables Continue with Google. Must match the Web client ID that issues the ID token. |
| `APPLE_CLIENT_ID` | empty | Enables Continue with Apple (Services ID). Domain and redirect must be registered with Apple. |
| `USDA_API_KEY` | `DEMO_KEY` | FoodData Central search. Get a free key if the demo key rate-limits. |
| `NINJAS_API_KEY` | empty | Optional. When set, Train uses [API Ninjas Exercises](https://api-ninjas.com/api/exercises). When empty, search falls back to the public [wger](https://wger.de) catalog (no key). |

### Demo account

On first boot with no users:

- Email: `demo@verax.app`
- Password: `verax-demo`
- Timezone: `Asia/Kolkata`
- Seeded habits, completions from 1 Jul 2026 through yesterday, goals, metrics, journal, and an 8-month transformation (Aug 2026–Apr 2027)

Seed only runs when there are no users. `VERAX_SEED=false` skips it.

### Docker

```bash
docker compose up --build
```

Maps the API to [http://localhost:8081](http://localhost:8081) and the web app to [http://localhost:5173](http://localhost:5173) (nginx, proxies `/api` to the API container). Compose also starts Redis; nothing reads it yet.

## 4.9 Deploy

The **website** is Vercel. The **API and your data** are Fly.io (Java 21 + Postgres). iPhone talks only to the Vercel origin; `vercel.json` rewrites `/api/*` to Fly.

### First time

```bash
# API + database (from backend/)
fly auth login
fly apps create verax-sonkar-api --org personal
fly postgres create --name verax-sonkar-db --region sin --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
fly postgres attach verax-sonkar-db -a verax-sonkar-api
fly secrets set VERAX_JWT_SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')" VERAX_SEED=false -a verax-sonkar-api
fly deploy -a verax-sonkar-api
```

Restore the local `demo@verax.app` database (never commit the dump):

```bash
pg_dump -h 127.0.0.1 -d verax -Fc --no-owner --no-acl -f /tmp/verax.dump
fly proxy 15432:5432 -a verax-sonkar-db
# other terminal:
pg_restore -h 127.0.0.1 -p 15432 --no-owner --no-acl --clean --if-exists -d verax /tmp/verax.dump
```

Then `vercel` from the repo root (project `verax`, production). Connect the GitHub repo so every push to `main` ships a new PWA. If the Fly hostname is not `verax-sonkar-api.fly.dev`, change the rewrite in `vercel.json`.

### iPhone

1. Open the Vercel URL in **Safari** (not Chrome).
2. Share → **Add to Home Screen**.
3. Log in as `demo@verax.app` / `verax-demo`.
4. After a code push, close the app from the app switcher and open it again so it can fetch the new build.

### Tests

```bash
cd backend && mvn test
cd frontend && npm run build
```

Backend coverage today: consistency scoring, habit scheduler, metric auto-complete thresholds. Frontend CI is a production build (`tsc` + Vite).

### Layout

```
backend/     Spring Boot API (package com.verax)
frontend/    Verax web app
docs/        Architecture and scoring
.github/     CI
```
