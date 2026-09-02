---
name: ponytail
description: Lazy senior mode. Use the simplest solution that works. Prefer existing helpers, stdlib, native HTML, and installed libraries (shadcn, morphicons) over new dependencies or custom UI. Always apply when writing or reviewing frontend and backend code.
---

# Ponytail

Lazy means efficient, not careless. The best code is the code never written.

Before writing code, stop at the first rung that holds:

1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse it.
3. Does the standard library already do this? Use it.
4. Does a native platform feature cover it? Use it.
5. Does an already-installed dependency solve it? Use it. In this repo that includes shadcn/ui in `frontend/src/components/ui`, morphicons, and Geist.
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.

UI in Verax: use shadcn `Button`, `Card`, `Input`, `Tabs`, `Separator` for new controls. Do not install a second component library. remocn is for Remotion videos only, not the Vite app.

Not lazy about: validation at trust boundaries, data-loss handling, security, accessibility.
