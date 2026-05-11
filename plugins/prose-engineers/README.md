# prose-engineers

Write technical documentation, articles, reviews, and postmortems in a storytelling style that's direct, humble, and problem-first.

## Install

```bash
/plugin install prose-engineers@eyay-toolkits
```

## What It Does

Produces writing that leads with the problem, uses concrete numbers and real examples, and avoids marketing fluff. Supports both public-facing (more scaffolding) and internal (tighter) modes.

## Skills

### technical-writer

Write technical documentation, articles, reviews, and postmortems.

**When to use**: blog posts, postmortems, code reviews, how-to guides, API docs.

### management-theatre

Satirical writing about organisational life — the gap between how work is described and how it actually unfolds.

**When to use**: "write something satirical about work", "roast a corporate event", "write a vignette about a bad meeting", "satirise startup culture", "LinkedIn post parody".

**Output formats**: vignette, blog/article, dialogue, LinkedIn post.

**Covers**: corporate, startup, remote/async, offsite, any org with hierarchy.

## Trigger

```
"Write a postmortem for last night's outage"
"Draft a blog post about migrating to Prisma"
"Review this technical article for tone"
"Write internal docs for the new auth flow"
"Write something satirical about a reorg"
"Roast this all-hands meeting"
```

## Modes

- **Public-facing** (default) -- more context, assumes less domain knowledge
- **Internal** -- tighter, assumes shared context. Trigger with: "use internal mode" or "this is internal"

## Style

- Problem-first framing (why should anyone read this?)
- Concrete over abstract (real numbers, real code, real scenarios)
- Direct with humility ("We found X works, but your mileage may vary")
- No ALL CAPS headers, no marketing language
