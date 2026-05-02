# technical-writer

Write technical documentation, articles, reviews, and postmortems in a storytelling style that's direct, humble, and problem-first.

## Install

```bash
/plugin install technical-writer@eyay-toolkits
```

## What It Does

Produces writing that leads with the problem, uses concrete numbers and real examples, and avoids marketing fluff. Supports both public-facing (more scaffolding) and internal (tighter) modes.

## When to Use

- Blog articles and technical posts
- Incident postmortems and retrospectives
- Product or code reviews
- How-to guides and process documentation
- API documentation and concept explanations

## Trigger

Ask to write, draft, or review any technical document. Examples:

```
"Write a postmortem for last night's outage"
"Draft a blog post about migrating to Prisma"
"Review this technical article for tone"
"Write internal docs for the new auth flow"
```

## Modes

- **Public-facing** (default) -- more context, assumes less domain knowledge
- **Internal** -- tighter, assumes shared context. Trigger with: "use internal mode" or "this is internal"

## Style

- Problem-first framing (why should anyone read this?)
- Concrete over abstract (real numbers, real code, real scenarios)
- Direct with humility ("We found X works, but your mileage may vary")
- No ALL CAPS headers, no marketing language
