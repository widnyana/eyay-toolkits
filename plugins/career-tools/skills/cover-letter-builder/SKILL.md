---
name: cover-letter-builder
description: >
  Build a tailored cover letter by scanning the current repo for the person's background
  (skills, experience, projects — from plain text, Markdown, LaTeX, or any prose file)
  and matching it to a job posting (title, company, description). Adapts tone, length,
  and structure to the application channel and company culture. Outputs a polished
  Markdown file named YYYY-MM-DD-company-position.md. Use this skill whenever
  the user asks to write a cover letter, apply for a job, draft an application letter,
  or wants to generate a cover letter from a job posting — even if they just paste a
  job description or say "write me a cover letter for this role".
---

# Cover Letter Builder

## Inputs

| Field | Source |
|---|---|
| Job title | User message or job posting |
| Company name | User message or job posting |
| Job description | User message or pasted text |
| Application channel | Default: `standard`; options: `linkedin`, `async-video-note` |
| Repo path | Default: current working directory (`.`) |

If any required field is missing and cannot be inferred, ask once — all at once.

---

## Step 1: Scan the Repo

Recursively scan the repo for files containing personal/professional information.

**Priority targets:**
- `*.md`, `*.txt`, `*.tex`, `*.rst` — prose, CVs, bios, READMEs
- `resume.*`, `cv.*`, `about.*`, `bio.*`, `profile.*` (any extension)
- `CLAUDE.md` or `claude.md` — may contain identity/context
- LaTeX `.tex` files — extract text, ignore preamble/macros
- Any file with keywords: experience, skills, education, projects, work, career, background

**Skip:**
- `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`, `*.lock`, `*.log`, binaries

**LaTeX handling:**
Strip LaTeX commands — extract readable text only:
```bash
sed 's/\\[a-zA-Z]*{[^}]*}//g; s/\\[a-zA-Z]*//g; s/[{}]//g'
```
Or use `pandoc` if available: `pandoc -t plain file.tex`

**Extract:**
- Name, contact info
- Work history: company, title, dates, key responsibilities
- Skills: technical, tools, languages, platforms
- Education
- Projects: name, description, tech used, outcomes
- Achievements, metrics, certifications

Synthesize into a single internal profile. Do not write this to disk.

---

## Step 2: Research the Company

Before writing, gather signals about the company's culture and communication style:

- **Tone of the job posting**: casual and direct (startup) vs. structured (enterprise) vs. mission-heavy (nonprofit/social impact)
- **Company handbook / careers page**: GitLab, Basecamp, Buffer, Automattic, and others publish their values and how they hire — read them if available
- **Recent blog / engineering posts**: shows what they care about technically and what language they use
- **Repeated keywords in the JD**: if "ownership", "shipping", "scale", "trust", or "craft" appear more than once, mirror them naturally in the letter

This research takes 2 minutes and is the difference between a generic letter and one that reads like the candidate did their homework.

---

## Step 3: Analyze the Job Posting

Parse for:

- **Must-haves**: required skills, years of experience, specific tools
- **Nice-to-haves**: preferred qualifications
- **Role context**: team size, product area, company stage, mission
- **Tone signals**: startup vs enterprise, technical vs cross-functional
- **Terminology to mirror**: specific words they repeat

---

## Step 4: Match Profile to Posting

Build a relevance map:

- Which experiences directly match the role's requirements?
- Which projects demonstrate the core skills?
- What are the strongest 2-3 signals to lead with?
- Any gaps? Bridge honestly with adjacent experience or trajectory — never fabricate.

---

## Step 5: Select Channel Format

### Standard (default) — full cover letter

- 4 paragraphs, 250–380 words, hard cap 400
- Structure:
  1. **Opening** — your strongest result or clearest signal, directly tied to the role. Do not open with "I am excited to". Lead with what you bring, not how you feel.
  2. **Body 1** — match 2-3 job requirements to specific outcomes with numbers and the job's own keywords
  3. **Body 2** — something specific about this company that shows you read more than the job title; connect it to why this role at this company makes sense for you
  4. **Closing** — one sentence of intent, one sentence CTA. No "please find attached", no "do not hesitate"

### LinkedIn Easy Apply — short cover note

- 100–150 words, single block of prose
- Lead with your strongest match to the role
- One company-specific sentence
- End with availability and contact preference
- No letterhead, no date, no signature block

### Async video note — written script companion

- 150–200 words, conversational register
- Written as if spoken aloud — short sentences, no complex syntax
- Structure: who you are → one concrete story → why this role → what you want to do next
- Flag to the user that this is a script; they need to record it

---

## Step 6: Write the Cover Letter

### Structure (standard format)

```
[City, Date — optional, infer from repo if available]

[Hiring Manager name / "Hiring Team" if unknown]
[Company Name]

[Opening paragraph]

[Body paragraph 1]

[Body paragraph 2]

[Closing paragraph]

[Name]
[Contact — if found in repo]
```

### Writing Rules (anti-AI-polish — enforce these strictly)

**Do:**
- Write like a sharp professional who knows their value — direct, confident, no hedging
- Use specific numbers, names, outcomes when available ("reduced P95 latency by 40%", "led migration of 3 services")
- Vary sentence length deliberately — short punches, longer explanations, not uniform rhythm
- Start sentences mid-thought when natural ("Three years building X taught me...")
- Use contractions where they read naturally ("I've", "it's", "that's")
- Reference something specific about the company from your Step 2 research
- Let personality show in 1-2 places — not every sentence

**Do NOT:**
- Use any of these phrases: "I am excited to", "I am passionate about", "thrilled", "leverage", "synergy", "utilize", "fast-paced environment", "team player", "detail-oriented", "results-driven", "I would be a great fit", "please find attached", "do not hesitate", "I am writing to express"
- Open with "I" as the first word of the letter
- Use the em dash (—) as a stylistic flourish more than once
- Use bullet points inside the letter body
- Summarize the job description back to the employer
- Start consecutive sentences with the same word
- Use passive voice where active works ("was responsible for" → "ran", "owned", "shipped")
- Write in lists or numbered points — prose only
- Use filler transitions: "Furthermore", "Additionally", "In conclusion", "To summarize"
- Write every sentence to the same length — ATS and human reviewers both flag uniform rhythm as a model signature
- Use abstract nouns doing verb work: "facilitation of", "enablement of", "optimization of"
- Pair adjectives in threes: "dedicated, hardworking, and results-oriented"
- Use "not only X, but also Y" constructions — a strong model tell

**Tone calibration:**
- Startup / early-stage: tight, direct, drop formality, show builder instinct
- Enterprise / corporate: structured, reference scale and process
- Mission-driven: acknowledge the mission briefly but don't perform enthusiasm
- Technical-first companies (Stripe, Linear, Cloudflare): precise language, show you think clearly in writing

---

## Step 7: Grammar & Quality Gate

Run this pass on the full draft **before writing to disk**. Fix everything in-place.

### Grammar checks

- Subject-verb agreement throughout
- Tense consistency — past for previous roles, present for current
- Article usage: "a" vs "an", missing articles before nouns
- Preposition correctness ("responsible for", not "responsible of")
- Comma splices — split or join with a conjunction
- Dangling modifiers — subject of opening clause must match main clause subject
- Pronoun clarity — no ambiguous "it", "they", "this" without clear referent
- Hyphenation: compound modifiers before nouns ("full-stack engineer", "five-year track record")

### Sentence quality checks

- No sentence over 35 words — break it up
- No two consecutive sentences starting with the same word
- No consecutive sentences of similar length — vary rhythm
- Each paragraph has a single clear purpose; if it doesn't, rewrite or cut
- Cut words that don't earn their place: "very", "really", "quite", "just", "actually", "basically", "essentially"
- Cut throat-clearing openers: "As someone who...", "Throughout my career...", "With X years of experience..."

### Authenticity re-check

- Re-scan for banned phrases from the Do NOT list — they creep back in during revision
- Verify no sentence reads like it was generated by a language model:
  - Overly balanced "not only X, but also Y" constructions
  - Suspiciously perfect parallelism across all clauses
  - Abstract nouns doing verb work ("facilitation of", "enablement of")
  - Every sentence approximately the same length
- At least one sentence must feel like *this specific person* wrote it — grounded in a real detail from their background

### Quality bar

The letter passes when:
- A native English speaker finds nothing to correct
- It reads like a sharp professional wrote it, not like a template was filled in
- Every claim is traceable to something in the repo scan
- Cutting any paragraph would make the letter weaker
- The company-specific reference in Body 2 is concrete, not generic ("I've been following your work on X" is not concrete; citing a specific post, product decision, or value is)

If the draft does not pass, rewrite the failing sections and re-check. Do not output a letter that doesn't clear this bar.

---

## Step 8: Output

### Filename format

```
<YYYY-MM-DD>-<company-slug>-<position-slug>.md
```

Rules for slug:
- Lowercase, hyphens only, no special chars
- Company: `acme-corp`, `stripe`, `scale-ai`
- Position: `senior-backend-engineer`, `staff-sre`, `founding-engineer`
- Date: today's date

Example: `2026-05-03-stripe-staff-platform-engineer.md`

### File content format

**Detect format before writing — in priority order:**

1. **User specified a format** → use it exactly
2. **Existing cover letter files found in repo** → mirror structure (header style, date format, signature block)
3. **No prior format found** → use the default below

Default:
```markdown
# Cover Letter — [Position] at [Company]

[Date]

[Body of the letter]

---
_Review before sending._
```

When mirroring: preserve section order, delimiter style, metadata fields — only replace body content.

Write the file to the current working directory (or repo root if specified).

---

## Step 9: Report to User

After writing:

1. State the output path
2. Show the letter in full for review
3. List the top 3 repo sources used (filename → what was extracted)
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
| No company handbook/public values found | Rely on tone signals from the job posting alone |
| LinkedIn channel selected | Output a short cover note (100–150 words), not the full letter format |
| Async video channel selected | Output a spoken script (150–200 words); remind user to record it |
