# Reading psychology: how humans actually process technical writing

Background for the "Write for how people actually read" principle in SKILL.md. Load
this when a piece needs restructuring for scannability, when deciding how long
something should be, or when justifying a structural edit to someone who wants
more prose.

Every number here comes from published research. Cite them the same way the skill
asks writers to cite anything else: with the source attached.

## 1. Scanning is the default mode, reading is the exception

Eye-tracking of 232 users across thousands of pages (Nielsen Norman Group, 2006,
re-confirmed 2017) found people read **at most 28% of the words on an average page,
and 20% is the more likely figure**. They do not read top to bottom. They sweep in
recognisable shapes:

- **F-pattern** — a wide horizontal sweep across the top, a shorter second sweep
  lower down, then a vertical scan down the left edge. This is what dense,
  unstructured prose produces. It is a *failure* signal: the reader found nothing
  to anchor on, so they fell back to the cheapest possible scan.
- **Layer-cake pattern** — the eye jumps heading to heading, dipping into body text
  only where a heading promises something relevant. This is what good structure
  produces, and it is the pattern to design for.
- **Spotted pattern** — hunting for one specific token: a number, a flag name, an
  error string, a function name.

**What this means for the writing:** the headings *are* the article for most
readers. If the heading list alone does not carry the argument, the argument does
not reach most of the audience. Body text is the expansion that a subset chooses to
open.

## 2. The first 10 seconds decide everything else

Analysis of visit durations across 205,873 pages (Liu et al., Microsoft Research;
summarised by NN/g) shows dwell time follows a Weibull distribution with a very
high early hazard rate. Readers are most likely to leave in the **first 10 seconds**.
Survive that, and the probability of leaving stays high for another ~20 seconds.
Only after roughly **30 seconds** does the curve flatten and the reader become
committed.

**What this means:** the value proposition has to land in the first screen — before
the setup, before the background, before the "in this article we will" paragraph.
This is the mechanism behind the skill's problem-first rule. Problem-first is not a
stylistic preference; it is what keeps the reader past the hazard peak.

## 3. Information scent governs whether anyone scrolls

Information Foraging Theory (Pirolli & Card, Xerox PARC) models readers as
foragers: they follow a trail as long as the *scent* — the cues predicting a payoff —
stays strong, and abandon it the moment scent drops. On a page, scent comes from
headings, link text, the first words of a paragraph, and visible structure such as
tables and code blocks.

Readers scroll below the fold only when what is above convinces them the rest is
worth it.

**What this means:** every heading must predict its section's payoff honestly.
"Background" has no scent. "Why the retry loop made the outage worse" does. Clever,
coy, or pun headings destroy scent — they are the writing equivalent of an
unlabelled button.

## 4. The first two words of anything carry disproportionate weight

NN/g's microcontent research: users effectively read the **first 11 characters** of
a heading or link before deciding whether to continue. The guidance that follows is
to front-load information-carrying words, so someone who sees only the first two
words still gets the gist.

**What this means:**

- ✗ "A deeper look at how our caching layer behaves under load"
- ✓ "Cache stampedes: what load testing missed"

Same for paragraphs. The first sentence carries the claim; the rest supports it.
Anyone who reads only first sentences should still get a correct, if thinner,
version of the argument.

## 5. Working memory holds about four things

Cowan (2001), *The magical number 4 in short-term memory*, revised Miller's famous
seven down to roughly **four chunks** once rehearsal and long-term-memory support
are controlled for. Sweller's Cognitive Load Theory adds the mechanism: extraneous
load — effort spent decoding presentation rather than content — directly displaces
capacity available for the actual material.

**What this means:**

- One idea per paragraph. Two ideas in one paragraph means the second one is lost.
- Lists beyond five items need splitting or ranking.
- Do not ask the reader to hold a definition for three paragraphs before using it.
  Define it where it is used.
- Every unresolved forward reference ("more on this later") is a slot occupied.
- Telegraphic noun-piles cost working memory directly: the reader has to unstack
  four nouns and reconstruct the verb before extracting meaning. This is why the
  skill bans them.

## 6. Attention span: what the research actually says

**The 8-second goldfish claim is fabricated.** It spread from a 2015 Microsoft
marketing infographic, which sourced it to a firm called Statistic Brain. When the
BBC investigated in 2017, Statistic Brain could produce no credible source. The
goldfish half was invented too. Do not cite it, and treat any writing advice built
on it as unfounded.

**What is measured** is attention duration *on a screen before switching*, tracked
by Gloria Mark (UC Irvine) across nearly two decades:

| Period | Average attention on one screen before switching |
|---|---|
| 2003–2004 | ~2.5 minutes |
| 2012 | ~75 seconds |
| 2016–2021 | ~47 seconds (median 40 seconds) |

This is a measure of **switching frequency, not comprehension capacity**. Humans
still read long books and watch long films. What changed is that on a screen, a
reader leaves and comes back — repeatedly — inside a single article.

**What this means, and it is not "write shorter":**

1. **Write for resumption, not just for brevity.** Assume the reader leaves roughly
   every 40–60 seconds and returns. The cost that matters is re-entry: can they
   find their place from the headings alone? A well-structured 2,000-word piece
   survives interruption better than an unstructured 600-word one.
2. **Make every section independently valuable.** A reader who returns mid-article
   should get value from the section in front of them without re-reading what came
   before.
3. **Put the payload at the anchors.** Numbers, commands, and conclusions belong in
   headings, tables, code blocks, and bolded first clauses — the places the eye
   lands after an interruption. A critical fact buried in the fourth sentence of a
   paragraph will be missed.
4. **One conclusion per screen.** If a section needs two screens of scrolling to
   deliver one point, it will be abandoned between them.

## 7. Concision and scannability are measurable, not aesthetic

Morkes & Nielsen's foundational web-writing study measured usability against a
control text:

| Version | Measured usability improvement |
|---|---|
| Concise (~half the word count) | +58% |
| Scannable (structure, no wording change) | +47% |
| Objective (claims instead of marketing language) | +27% |
| All three combined | +124% |

**What this means:** the skill's three oldest rules — cut words, add structure, drop
marketing language — are each independently measurable, and they compound. Marketing
language is not merely distasteful; it measurably degrades comprehension, because
readers spend capacity discounting the claims instead of absorbing them.

## 8. Two effects worth exploiting deliberately

- **Primacy and recency.** The opening and the closing are retained best. Put the
  problem at the top and the lesson at the bottom. The middle is where detail goes,
  because that is where retention is naturally weakest — which is exactly what the
  skill's structure template already does.
- **The Von Restorff (isolation) effect.** A visually distinct item is remembered
  better. One bolded warning, one callout, or one table on a page is memorable.
  Five of them are wallpaper. Spend the emphasis budget on the single thing that
  costs the reader most if missed.

## Sources

- Nielsen Norman Group, *How Users Read on the Web*, and *F-Shaped Pattern For Reading Web Content* (2006, re-confirmed 2017) — https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/
- Nielsen Norman Group, *The Layer-Cake Pattern of Scanning Content on the Web* — https://www.nngroup.com/articles/layer-cake-pattern-scanning/
- Nielsen Norman Group, *How Long Do Users Stay on Web Pages?* (Weibull analysis of Liu et al., Microsoft Research) — https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/
- Nielsen Norman Group, *Information Foraging: A Theory of How People Navigate on the Web* — https://www.nngroup.com/articles/information-foraging/
- Nielsen Norman Group, *First 2 Words: A Signal for the Scanning Eye* — https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/
- Nielsen Norman Group, *Concise, SCANNABLE, and Objective: How to Write for the Web* (Morkes & Nielsen, 1997) — https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/
- Cowan, N. (2001). *The magical number 4 in short-term memory: A reconsideration of mental storage capacity.* Behavioral and Brain Sciences, 24(1), 87–114.
- Sweller, J. Cognitive Load Theory.
- Pirolli, P. & Card, S. Information Foraging Theory (Xerox PARC).
- Mark, G. *Attention Span* (2023); UC Irvine research, 2004–2021 — https://gloriamark.com/attention-span/
- BBC (2017) investigation debunking the 8-second "goldfish" attention-span claim, traced to Statistic Brain via a 2015 Microsoft marketing infographic.
