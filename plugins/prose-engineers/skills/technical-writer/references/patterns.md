# Structure patterns

Templates for the common piece types. Load when starting a draft; pick the pattern
that matches what the user asked for, then adapt. These are starting points, not
forms to fill in — delete any section that has nothing real to put in it.

Every template assumes the rules in SKILL.md: problem first, headings that carry the
argument, real numbers, no invented examples.

---

## Default structure

Use when nothing more specific fits.

```
# [The problem or discovery]

Opening: what's broken, surprising, or expensive? Lead with the reason to keep reading.
This is the first 10 seconds — spend them on the problem, not the setup.

## The context (optional)
Brief background: the situation, constraint, or question that led here.
Cut this section if the opening already covers it.

## The breakdown
How it works, how it was done, or how it breaks.
Use subsections, tables, and code blocks. Be specific: times, sizes, versions, metrics.
Include "what not to do" when the failure mode is common.

## The reasoning
Why this choice? What breaks without it? What are the trade-offs?
Not defensive, just honest. Name the edge cases and the limits.

## Applied (optional)
A real walkthrough showing it in action.

## Gotchas and lessons
What surprised us. What was learned the hard way.
Common failures, edge cases, second-order effects.
```

For a personal vault, append `#tags` on the last line. Skip tags for published work.

---

## How-to / process

Lead with the problem the process solves. Break into steps carrying concrete details
(timings, parameters, exact commands). Include what not to do, because the failure
modes teach more than the happy path. Show a variation or two for different contexts.
End with the one thing that surprises people.

```
## How to [thing]

Why it matters: [the problem this solves]

### The process
1. [Step] — with specifics: exact command, timing, threshold
2. [Step]
3. [Step]

### What not to do
- Don't [mistake] — it causes [consequence]
- Avoid [trap] — because [reason]

### Variations
- If [condition], do [variant]
- In [other case], try [alternative]

### The gotcha
One thing people learn the hard way: [surprising edge case]
```

---

## Product / code review

Lead with the change and why it matters. Break the trade-off into what improved and
what got worse, both with numbers. Show the evidence. Name the conditions where the
old approach still wins — a review with no "don't use this when" section reads as
advocacy, not analysis.

```
## Why we switched from [old] to [new]

### The context
We were using [old approach] and hit [specific problem].

### The trade-off
- Better: [improvement, with a number]
- Worse: [cost, with a number]
- Break-even at: [threshold or condition]

### The data
[Benchmarks, metrics, real usage, actual failure counts]

### When not to use this
[Conditions where the old approach is still the right call]

### What we learned
[The surprising part, the second-order effect, the gotcha]
```

---

## Explanation / concept

Start with the problem the concept solves, not the concept itself. Use analogy only
when it genuinely clarifies — a bad analogy costs more than no analogy, because the
reader now has to unlearn it. Show structure through breakdown: process, components,
flow. Use real code and real scenarios liberally. End with "so what" — why this
changes what the reader does.

---

## Retrospective / postmortem

Lead with what happened, factually and without blame. Lay out the timeline. Explain
the root cause as a system failure, not a person's mistake. Show what changed, even
where the fix is partial. Be honest about impact: duration, users affected, cost.

```
## [Thing] failed on [date] — what we learned

### What happened
[Clear 2–3 sentence summary]

### Timeline
- 14:15 — [Event] triggered [symptom]
- 14:30 — [Detection], started [mitigation]
- 15:45 — [Resolution]
- Total duration: [X minutes]

### Root cause
[Why the system broke, not who broke it]
The underlying issue: [the specific technical failure]

### What we did immediately
[Recovery actions]

### Longer-term changes
[What's being built to prevent recurrence]

### What surprised us
[The thing nobody expected]

### Still learning
[Open questions, edge cases still being investigated]
```
