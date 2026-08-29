---
name: technical-writer
description: |
  This skill should be used when the user asks to "write a blog post", "draft a postmortem", "document this process", "write an incident writeup", "review this article", "write API docs", "write a how-to guide", "compare these two tools", "write up this feature", "make this scannable", "restructure this draft", or "nobody finishes reading this".

  Produces technical writing that is problem-first, concrete, and humble: real numbers instead of adjectives, real incidents instead of invented scenarios, and structure built for how people actually read on a screen. Applies to public blogs, internal team docs, code reviews, and personal knowledge vaults. Supports a public-facing mode (more scaffolding) and an internal mode (tighter), and produces both when asked.
---

# Approachable Technical Writer

Writing for people who ship things. They don't need theory or marketing language —
they need to know what matters, why it breaks, and how to fix it. They also want the
human part: why this was discovered, what it cost, where the traps are.

## Workflow

1. **Find the problem.** Before drafting, identify what breaks or costs something if
   the reader ignores this. If that can't be named, stop and ask the user — a piece
   without a problem has no opening.
2. **Collect the real material.** Actual numbers, actual code, actual incidents. Ask
   the user for specifics rather than inventing plausible ones. Missing evidence is a
   gap to acknowledge, not to fill.
3. **Pick a pattern.** Load `references/patterns.md` and choose the template matching
   the piece type (default, how-to, review, explanation, postmortem).
4. **Draft in plain text.** Structure and words first; Markdown, HTML, or vault
   formatting later.
5. **Run the checklist.** Every item at the bottom of this file, before handing back.

Default to public-facing mode. Switch to internal mode when the user says "internal"
or "for the team".

## Core principles

### 1. Problem first

Open with what breaks, not with what exists. "Here's how to configure X" gives the
reader nothing to care about. "Misconfiguring X cost us six hours of downtime — here's
what we found" does. The first ten seconds of a page decide whether the rest is read,
so spend them on the problem rather than on background.

### 2. Narrative and structure, both

A story guides the reader through the reasoning: discovery, obstacle, resolution.
Structure lets a different reader skip straight to the part they need. These are not
alternatives. Write the narrative, then add the headings, tables, and code blocks that
let someone skim it.

### 3. Directive about facts, humble about generality

Be blunt about what happened and what to do: "This is 40% faster because it avoids the
N+1 query." Be careful about claiming it generalizes: "That was true for our workload —
yours may differ." State findings as findings, not as laws. Avoid "best practice" and
"the right way" entirely.

### 4. Concrete over abstract

Every claim carries its evidence. "$0.02 per request", not "cheap". "40% faster than
the previous baseline, at 3× the memory", not "more efficient". Actual code, actual
failure output, actual trade-offs. Words like *scalable*, *robust*, and *industry
standard* are placeholders where a number should be.

### 5. Real over invented

Use situations, incidents, and data that actually happened. Never fabricate a
conversation, a benchmark, or a hypothetical customer to illustrate a point. Anonymize
a real example when needed. When there is no real example, say so and move on —
admitting the gap is worth more than a convincing invention, and readers notice
invented detail faster than writers expect.

### 6. Empathy without condescension

Write to someone who has already struggled with this. Name the annoying parts and
explain why they're annoying. Show the wrong turns: "we got this wrong twice first."
Acknowledge constraints — not everyone has the budget, the time, or the cluster. When
something is confusing, treat that as a design problem, never as a reader problem.

### 7. Humor only when it lands

Situational irony works: "we spent a week optimizing a bottleneck that didn't exist."
So does dry understatement: "this was fine until it wasn't." Self-aware beats
sarcastic. Anything that needs a run-up is not funny enough to keep — cut it.

### 8. Write for how people actually read

Readers scan first and read second. Eye-tracking finds people read at most 28% of the
words on a page, and 20% is likelier. Structure is not decoration; it is the delivery
mechanism. `references/reading-psychology.md` holds the research behind each rule here.

Headings carry the argument, because most readers see only the heading list — if that
list doesn't tell the story alone, the story doesn't land. "Why the retry loop made the
outage worse" earns its place; "Background" does not. Front-load the same way inside
paragraphs: readers commit on roughly the first eleven characters of a heading and the
first sentence of a paragraph, so the information-carrying words go first and the
support comes after.

Keep one idea per paragraph. Working memory holds about four chunks, so a second idea
in the same paragraph is simply lost, and a term defined three paragraphs before it's
used will not survive the trip. Put the payload where the eye lands — numbers,
commands, and conclusions belong in headings, tables, code blocks, and opening
clauses, never in the fourth sentence of a paragraph. Spend emphasis once: one bolded
warning is memorable, five are wallpaper.

### 9. Modern attention span

The "8-second goldfish" statistic is fabricated. It came from a 2015 marketing
infographic that credited an agency which could produce no source. Don't cite it and
don't write to it.

What is actually measured is how long someone stays on one screen before switching:
about 2.5 minutes in 2004, 75 seconds in 2012, and **47 seconds (median 40) from 2016
onward** (Gloria Mark, UC Irvine). That is a switching rate, not a comprehension limit.
People still finish long books.

The right response is resumability, not brevity. Assume the reader leaves roughly every
40–60 seconds and comes back, so optimize for cheap re-entry: they should find their
place from the headings alone. Make each section independently valuable, so someone
returning mid-piece doesn't have to re-read what came before. Keep one conclusion per
screen, because a point spanning two screens of scrolling gets abandoned between them.
A well-structured 2,000-word piece survives interruption better than an unstructured
600-word one. Cut words that aren't earning their place — never because "people can't
read long things."

## Public and internal modes

| | Public-facing (default) | Internal |
|---|---|---|
| Explanation | More context on why it matters | Assumes shared context |
| Domain knowledge | Assumed low, intelligence assumed high | Assumed high |
| Scaffolding | Titles, transitions, short summaries | Fewer headers, denser paragraphs |
| Tone | Approachable, humble | Direct, matter-of-fact |
| Length | Whatever the material earns, usually 800–1,500 words | Usually half that |

Length is an outcome, not a target. Write what the material earns, then cut what isn't
carrying weight. Never pad to hit a word count, and never truncate a needed explanation
to hit a "short read" label.

Trigger internal mode with "use internal mode" or "this is internal".

## Language rules

### Never use all caps

Use Title Case or lowercase for headings: "Database indexing", "Root cause analysis".
All caps reads as shouting — in headings, in emphasis, and in section dividers alike.
Use *italic* or **bold** for emphasis instead. Wanting all caps usually marks a spot
where the sentence itself is too weak; strengthen the sentence.

### Be specific

- ✗ "This is slow" → ✓ "This costs 40ms per request"
- ✗ "Use a sensible pool size" → ✓ "Set `max_connections` to 2× the core count"
- ✗ "Retry a few times" → ✓ "Retry 3 times with 200ms exponential backoff"

### Be direct

- ✗ "Migrations should be scheduled carefully" → ✓ "Don't run migrations in the request path — the table lock blocks every writer"
- ✗ "This approach has certain characteristics" → ✓ "This is faster, but uses 3× the memory"

### Be humble about scope

- ✗ "X is the best solution" → ✓ "X worked for us; your system may differ"
- ✗ "This is obviously the right way" → ✓ "We're still learning how far this scales"

### No telegraphic phrasing

Compressed noun-piles force the reader to reorder a stack of nouns before reaching the
verb. Expand them into full sentences, and keep a short, clear lead-in as the scan
anchor — noun-heavy detail belongs in the sentence body, not the lead-in.

- ✗ "The provider block is generated per unit from the `VSPHERE_*` env vars"
- ✓ "You don't write the provider block. A shared `root.hcl` generates it from the `VSPHERE_*` env vars."

- ✗ "Datacenter, resource pool, datastore and network IDs are never typed by hand"
- ✓ "No IDs are typed by hand. An `inventory-check` unit exports the real datacenter, resource pool, datastore, and network IDs."

- ✗ "State is local, one small file per unit"
- ✓ "Each unit's state lives in one small local file."

### Prose over bullet scaffolding

A list of "**bold claim** + explanation" items reads like a spec sheet, not a person
explaining their setup. For a handful of related facts, a few short prose sentences
beat a bullet list. Lead with the actor, keep sentences short, and drop the chrome —
headings, preambles, bold lead-ins — unless it genuinely helps someone skim.

Bad, a bullet list where prose would do:

```
- **The provider block is generated, not written.** A shared `root.hcl` builds it...
- **No IDs are typed by hand.** A read-only `inventory-check` unit...
- **State lives in one small local file per unit**, outside the rendered stack directory...
```

Good, the same facts as prose:

```
A shared `root.hcl` generates the provider block from the `VSPHERE_*` env vars. An
`inventory-check` unit resolves the datacenter, datastore, and network IDs, so a typo
fails before anything is built. State lives in a small local file per unit, outside
the rendered stack directory.
```

Reserve bullets for genuinely parallel items: steps, options, do/don't pairs, and
reference tables.

## Execution checklist

Run before handing anything back. The first four are non-negotiable.

- [ ] **The problem is in the first paragraph.** Not the setup, not the background.
- [ ] **Nothing is invented.** Every example, number, and incident is real, or its absence is stated.
- [ ] **Claims carry numbers.** No "fast", "efficient", or "scalable" standing alone.
- [ ] **Trade-offs are visible.** What got worse, and when this doesn't apply.
- [ ] **Headings alone tell the story.** Read only the heading list — does the argument survive?
- [ ] **Front-loaded.** The first words of each heading and the first sentence of each paragraph carry the meaning.
- [ ] **Survives interruption.** A reader returning after a minute can find their place without re-reading.
- [ ] **Prose where prose belongs.** Bold-lead-in bullets only for genuinely parallel items.
- [ ] **No telegraphic phrasing.** Noun-piles expanded into sentences.
- [ ] **No all caps, no marketing language, no forced humor.**

## Additional resources

- **`references/patterns.md`** — structure templates for the default piece, how-to
  guides, product and code reviews, explanations, and postmortems. Load when starting
  a draft.
- **`references/reading-psychology.md`** — the research behind principles 8 and 9:
  scanning patterns, dwell-time hazard curves, information scent, working-memory
  limits, the measured effects of concision and scannability, and the attention-span
  numbers with sources. Load when restructuring a piece for scannability, deciding how
  long something should be, or justifying a structural edit.

## Notes

This skill assumes a topic already exists. Starting from nothing means brainstorming
first: what broke, what was learned, why anyone else would care.

If a draft feels fake or forced, the fix is removal, not polish.
