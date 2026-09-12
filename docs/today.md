# Today (the clock)

This is the regulate surface. One job: **what do I do in this block, on this weekday, under this energy?**

Home scores the eight rooms from the same ticks. Rooms hold protocols. Today does not dump the life.

Current `/today` (cadence tabs, Non-negotiables / Growth / Other, timer parked at the top) is replaced by this spec. Scoring rules in [architecture.md](architecture.md) stay: done / partial / skip / pending, 50% streak, parent folders do not score.

---

## Chrome (always on screen)

| Element | What it shows |
|---|---|
| Date | Wednesday 31 August (or whatever today is) |
| Energy | BUILD / CONNECT / EXPLORE / RECOVER / RESET — from the weekday table |
| Clock | Device time. Drives which block is **Now** |
| Day score | `done / scheduled` and `%` — same formula as now, sticky at the bottom |

No daily / weekly / monthly tabs. Weekly and monthly items appear only when they are due (Thursday Voice plan, Saturday organise, 1st-of-month Money, last Sunday Voice review).

---

## How the list is shaped

The day is a stack of **blocks** in clock order. Each block has:

- Start–end (or a single timestamp)
- Aspect (one primary; shutdown is the exception)
- Title
- Checks (few)
- Optional protocol (sheet, recipe, nested list) **one tap behind**

### Block states

| State | When | How it looks |
|---|---|---|
| **Now** | Current time is inside the window | Open, large, first thing under the chrome |
| **Up next** | The following block | Visible, compact |
| **Later** | Rest of the day | Collapsed by title + time. Expand to tick early if you already did it |
| **Past** | Window ended | Compact. Unticked items stay tappable until **21:30**. After 21:30 they stay visible but are not demanded — sleep wins |

All-day logs (water, steps) are not blocks. They sit as a thin strip under the chrome: water litres, step count. Always reachable.

Coffee 12:00 is a timestamp on the Work day, not a scored check.

---

## Monday 06:20 vs Thursday 06:20

Same clock time. Different block. That is the whole point.

### Monday — BUILD — 06:20–07:30 **Now**

```
NOW  06:20–07:30
Body · Training
Push · Week 1          [tick: Training]

  During session
  [ ] ~1 L water
  ORS only if needed

  Open sheet          → Push Week 1 lifts
```

- One scored check: **Training** (Critical)
- Nested: gym water (counts toward the day water log, not a second Body score if we treat it as a child of Training — child scores, parent is folder). **Decision:** Training is the parent folder; gym water is a child. The session tick can auto-complete when the sheet is used, or you tick Training when the session is done.
- Protocol behind “Open sheet”: the Monday Push Week 1 or Week 2 list (alternate weeks). You do not see 8 lift rows until you open it.
- **Up next:** 07:30 Post-workout (protein, creatine, shower). Hair wash only if it is Wednesday (oil + Shreekesha) or Saturday (Detoxie). Monday: no wash row.

### Thursday — RECOVER — 06:20–07:30 **Now**

```
NOW  06:20–07:30
Voice · Plan (30 min)
No structured training

[ ] Review content bank
[ ] Choose this week’s idea
[ ] Rough hook
[ ] What needs filming
    hook / story / 3–5 points / ending / shots
```

- Body Training does **not** appear
- These Voice checks are Optional relative to sleep, Important relative to skipping the week’s content
- **Up next:** 07:30 is not “post-workout.” Thursday still has wake + ACV + banana already in **Past**. Next Body block is 08:00 skin + scalp (you still get ready; you did not train). Then 08:15 Sit.
- Deep work still starts **09:40**. Career still **14:00–19:00**. Recover is the morning session and the evening, not a day off work.

---

## Full weekday skeleton (Mon–Fri)

Shared blocks unless a row says otherwise.

| Time | Block | Mon | Tue | Wed | Thu | Fri |
|---|---|---|---|---|---|---|
| 06:00 | Wake | ACV, banana, freshen — always | same | same | same | same |
| 06:00 | Hair | Spray | Spray | Oil | Spray | Spray |
| 06:20–07:30 | Session | Push | Swim | Pull | **Voice plan** | Boxing |
| 07:30 | Post | Protein + creatine + shower | same | same + **Shreekesha wash** | Shower / get ready only (no protein protocol required) | Protein + creatine + shower |
| 08:00 | Skin | Minoxidil + finasteride, facewash, moisturiser, sunscreen | same | same | same | same |
| 08:15–08:30 | Sit | Meditation 15 min + timer | same | same | same | same |
| 08:45 | Breakfast | Oatmeal + Vit D ×4, multi, Omega-3. Open recipe | same | same | same | same |
| 09:10–09:40 | Sun + read | Sunlight check + read check. No scroll | same | same | same | same |
| 09:40–13:00 | Deep work | One check: Deep work. Note: “what moved.” Timer optional | same | same | **same** | same |
| 13:00 | Lunch | Plate + walk + Omega-3. Open recipe | same | same | same | same |
| 14:00–19:00 | Career | One check: Career block (70/20/10) | same | same | **same** | same |
| 19:00–20:00 | Dinner | Cook + dinner base. Open recipe | same | same | same | same |
| 20:00–21:00 | Life | Walk 7500 | Walk 7500 | **People / Play** | Walk / easy | **People / Play** |
| 21:00–21:30 | Shutdown | Nested list in [life.md § 2.3](life.md#23-night-shutdown-21002130) | same | same | same | same |
| 21:30 | Sleep | Log sleep start. After this, leftover ticks are not demanded | same | same | same | same |

Hair wash row only on Wed (Shreekesha) and Sat (Detoxie).

Meds doses, if any, attach to the block that matches their time (morning supplements already sit in 08:45; night magnesium sits in shutdown). Do not keep a separate Medicines chapter on Today.

---

## Now card (the only large thing)

When a block is Now, the card contains:

1. Time range + aspect chip + title  
2. The 1–5 checks for that block  
3. **Open protocol** if the block has a sheet / recipe / nested list  
4. Tools that belong here and nowhere else on the page:
   - Sit → focus timer (15:00, writes meditation minutes)
   - Deep work / Career → optional timer
   - Water strip is global, but gym water is on the Training card
   - Journal in shutdown → three questions, not the full journal form
   - Training → week 1/2 sheet
   - Voice plan → content-bank fields (short)

You do not see the boxing combinations list on Monday. You do not see the oatmeal gram list until you open breakfast.

---

## Saturday and Sunday

Same chrome. Different block stack. Weekday 09:40 Deep work is **absent**.

**Saturday Now examples**

- 06:20 → Training · Legs · open Legs W1/W2  
- 09:30 → Voice · Toastmasters · one check  
- 10:30 → Place · Organise · nested checklist (house / backups / digital / Money slice). One parent check “Organise”; children are the Saturday list  
- 14:00 → Play · Music class HSR  
- After music → People + Play · one check “Explore / people” with a note of what you actually did  
- 21:00 → Shutdown (same nested list)

**Sunday Now examples**

- 06:20 → Yoga  
- 08:15 → Sit + pray  
- 08:45 → Breakfast (Omega-3 ×2 as written for Sunday)  
- 09:40 → Voice · Production (three hour-checks: film / produce / schedule)  
- 13:00 → Play · **one check** “Play — pick from menu” + log what you picked. Football and trek are not three missed habits  
- 20:00 → Dinner + walk 7500  
- 20:00–20:30 → Voice engagement (30 min)  
- 20:30 → Shutdown  
- Last Sunday of month: extra block Voice review 45–60 min (inject before or after engagement)

---

## Injections (not extra tabs)

| When | What appears on Today |
|---|---|
| 1st of any month | Money block: invest allocation + budget pass. Place block: hygiene checklist (no password values) |
| Last Sunday | Voice monthly review block |
| Quarterly window | Body checkup / dentist / clothes — as a Place + Body check that week, not every day |

---

## After 21:30

- Sleep check is Now until you log it (or morning)
- Remaining open checks: still tappable, visually muted, copy: **Sleep first**
- They do not nag. Past days still count unlogged as missed (existing scoring). *Today after 21:30* does not add new scheduled items

---

## What is not on Today

- Goal lists (those live in rooms)
- Content doctrine, flywheel, 90-day Voice plan
- Full Place password names unless it is the 1st and you opened hygiene
- Play’s entire horizon (surfing, languages) — only today’s pick
- Cadence tabs
- Sections named Non-negotiables / Growth / Other

---

## Monday Now vs Thursday Now (summary)

| | Monday 06:20 | Thursday 06:20 |
|---|---|---|
| Energy | BUILD | RECOVER |
| Aspect | Body | Voice |
| Title | Training · Push W1 or W2 | Plan (30 min) |
| Scored | Training session + gym water child | Four short Voice checks |
| Protocol | Lift sheet | Content bank + hook |
| Protein at 07:30 | Yes | No (get ready only) |
| 09:40 Deep work | Yes | Yes |
| 20:00 | Walk 7500 | Walk / easy evening |

If those two cards ever look the same, Today is wrong.
