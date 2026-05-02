---
name: cover-letter-builder
description: >
  Build a tailored cover letter by scanning the current repo for the person's background
  (skills, experience, projects — from plain text, Markdown, LaTeX, or any prose file)
  and matching it to a job posting (title, company, description). Outputs a polished
  Markdown file named YYYY-MM-DD-company-position.md. Use this skill whenever
  the user asks to write a cover letter, apply for a job, draft an application letter,
  or wants to generate a cover letter from a job posting — even if they just paste a
  job description or say "write me a cover letter for this role".
---

# Cover Letter Builder

## Inputs

The user must supply — or you must extract from their message:

| Field | Source |
|---|---|
| Job title | User message or job posting |
| Company name | User message or job posting |
| Job description | User message or pasted text |
| Repo path | Default: current working directory (`.`) |

If any field is missing and cannot be inferred, ask once — all at once.

---

## Step 1: Scan the Repo

Recursively scan the repo for files that contain personal/professional information.

**Priority targets:**
- `*.md`, `*.txt`, `*.tex`, `*.rst` — prose, CVs, bios, READMEs
- `resume.*`, `cv.*`, `about.*`, `bio.*`, `profile.*` (any extension)
- `CLAUDE.md` or `claude.md` — may contain identity/context
- LaTeX: `.tex` files — extract text, ignore preamble/macros
- Any file with keywords: experience, skills, education, projects, work, career, background

**Skip:**
- `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`, `*.lock`, `*.log`, binaries

**LaTeX handling:**
Strip LaTeX commands — extract readable text only:
```bash
# fast approximation: strip \cmd{...} and environments
sed 's/\\[a-zA-Z]*{[^}]*}//g; s/\\[a-zA-Z]*//g; s/[{}]//g'
```
Or use `pandoc` if available: `pandoc -t plain file.tex`

**What to extract per file:**
- Name, contact info
- Work history: company, title, dates, responsibilities
- Skills: technical, tools, languages, platforms
- Education
- Projects: name, description, tech used, outcomes
- Achievements, metrics, certifications

Synthesize everything into a single internal profile. Do not write this to disk.

---

## Step 2: Analyze the Job Posting

Parse the job description for:

- **Must-haves**: required skills, years of experience, specific tools/technologies
- **Nice-to-haves**: preferred qualifications
- **Role context**: team size, product area, company stage, mission
- **Tone signals**: startup vs enterprise, technical vs cross-functional, formal vs casual
- **Red flags to mirror**: specific terminology they repeat (e.g., "ownership", "shipping", "scale")

---

## Step 3: Match Profile to Posting

Build a relevance map:

- Which experiences directly match the role's requirements?
- Which projects demonstrate the core skills?
- What's the strongest 2-3 signals to lead with?
- Any gaps? If yes, bridge honestly (adjacent experience, learning trajectory) — do not fabricate.

---

## Step 4: Write the Cover Letter

### Structure

```
[City, Date — optional, infer from repo if available]

[Hiring Manager / "Hiring Team" if unknown]
[Company Name]

Opening paragraph — the hook
Body paragraph 1 — strongest signal match
Body paragraph 2 — second signal or narrative arc
Closing paragraph — intent + call to action

[Name]
[Contact — if found in repo]
```

### Writing Rules (critical — anti-AI polish)

**Do:**
- Write like a sharp human who knows their value — direct, confident, no hedging
- Use specific numbers, names, outcomes when available ("reduced P95 latency by 40%", "led migration of 3 services")
- Vary sentence length deliberately — short punches, longer explanations
- Start sentences mid-thought when natural ("Three years building X taught me...")
- Use contractions where it reads naturally ("I've", "it's", "that's")
- Reference something specific about the company that shows genuine interest
- Let personality show in 1-2 places — not every sentence

**Do NOT:**
- Use any of these phrases: "I am excited to", "I am passionate about", "thrilled", "leverage", "synergy", "fast-paced environment", "team player", "detail-oriented", "results-driven", "I would be a great fit", "please find attached", "do not hesitate"
- Use the em dash (—) as a stylistic flourish more than once
- Open with "I" as the first word of the letter
- Use bullet points inside the letter body
- Summarize the job description back to the employer
- Start consecutive sentences with the same word
- Use passive voice where active works ("was responsible for" → "ran", "owned", "shipped")
- Write in lists or numbered points — prose only
- Use filler transitions: "Furthermore", "Additionally", "In conclusion", "To summarize"

**Tone calibration based on company signals:**
- Startup/early-stage: tighter, more direct, drop formality, show builder instinct
- Enterprise/corporate: slightly more structured, reference scale and process
- Mission-driven: acknowledge the mission briefly, but don't overdo it

### Length
- Target: 3-4 paragraphs, 250-380 words
- Hard cap: 400 words
- Do not pad to fill space

---

## Step 4b: Grammar & Quality Gate

Run this pass on the full draft **before writing to disk**. Fix everything in-place — do not note issues and move on.

### Grammar checks

- Subject-verb agreement throughout
- Correct tense consistency — past tense for previous roles, present for current
- Article usage: "a" vs "an", missing articles before nouns
- Preposition correctness ("responsible for", not "responsible of")
- Comma splices — split or join with a conjunction
- Dangling modifiers — ensure the subject of an opening clause matches the main clause
- Pronoun clarity — no ambiguous "it", "they", "this" without a clear referent
- Hyphenation: compound modifiers before nouns ("full-stack engineer", "five-year track record")

### Sentence quality checks

- No sentence over 35 words — break it up
- No two consecutive sentences starting with the same word
- No consecutive sentences of similar length — vary rhythm
- Each paragraph must have a clear single purpose; if it doesn't, rewrite or cut
- Cut any word that doesn't earn its place: "very", "really", "quite", "just", "actually", "basically", "essentially"
- Cut throat-clearing openers: "As someone who...", "Throughout my career...", "With X years of experience..."

### Authenticity re-check

- Re-scan for banned phrases from the Do NOT list — they sometimes creep back in during revision
- Verify no sentence reads like it was generated by a language model:
  - Overly balanced "not only X, but also Y" constructions
  - Suspiciously perfect parallelism across all bullets or clauses
  - Abstract nouns doing the work verbs should do ("facilitation of", "enablement of")
- At least one sentence must feel like *this specific person* wrote it — grounded in a real detail from their background

### Quality bar

The letter passes when:
- A native English speaker would find nothing to correct
- It reads like it was written by a sharp professional, not assembled from templates
- Every claim is traceable to something in the repo scan
- Cutting any paragraph would make the letter weaker

If the draft does not pass, rewrite the failing sections and re-check. Do not output a letter that doesn't clear this bar.

---

## Step 5: Output

### Filename format
```
<YYYY-MM-DD>-<company-slug>-<position-slug>.md
```

Rules for slug:
- Lowercase, hyphens only, no special chars
- Company: `acme-corp`, `stripe`, `scale-ai`
- Position: `senior-backend-engineer`, `staff-sre`, `founding-engineer`
- Date: today's date in `YYYY-MM-DD`

Example: `2025-11-14-stripe-staff-platform-engineer.md`

### File content format

**Detect format before writing — in priority order:**

1. **User specified a format** → use it exactly as described
2. **Existing cover letter files found in repo** → extract their structure (header style, date format, signature block, footer conventions) and mirror it
3. **No prior format found** → use the default below

Default (only when no existing format is detected):
```markdown
# Cover Letter — [Position] at [Company]

[Date]

[Body of the letter]

---
_Generated from repo scan. Review before sending._
```

When mirroring an existing format: preserve section order, delimiter style, metadata fields, and any front matter — only replace the body content.

Write the file to the **current working directory** (or repo root if specified).

---

## Step 6: Report to User

After writing:

1. State the output path
2. Show the letter in the conversation for review
3. List the top 3 repo sources used (filename + what was extracted)
4. Flag any gaps between the job requirements and what was found in the repo

---

## Edge Cases

| Situation | Handling |
|---|---|
| No relevant files found | Ask user to provide a summary of their background inline |
| Only a README found | Extract what's there; note it's thin; produce best-effort letter |
| Multiple CV/resume files | Merge; prefer the most recent by filename or date metadata |
| LaTeX with complex macros | Use `pandoc` first; fall back to regex strip |
| Job description is vague/short | Ask for one clarifying detail: what does "success" look like in year 1? |
| Company name has spaces/symbols | Slugify: `Scale AI` → `scale-ai`, `Acme Corp.` → `acme-corp` |
