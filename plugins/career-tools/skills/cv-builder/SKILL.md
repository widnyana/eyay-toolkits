---
name: cv-builder
description: >
  Build or update a Curriculum Vitae (CV) by scanning a repo for the person's background
  (experience, skills, education, projects — from plain text, Markdown, LaTeX, or any
  prose file). Outputs a polished, ATS-friendly Markdown CV and optionally a LaTeX or
  PDF-ready version. Use this skill whenever the user asks to build a CV, update their
  resume, create a curriculum vitae, or consolidate their background into a structured
  document — even if they just say "make me a CV from this repo" or "build my resume".
---

# CV Builder

## Inputs

| Field | Required | Notes |
|---|---|---|
| Repo path | Yes (default: `.`) | Where to scan for background info |
| Target role/domain | No | Tailors section ordering and emphasis |
| Output format | No | Auto-detected (see below); override with `markdown`, `latex`, or `both` |
| Output path | No | Default: `cv-YYYY-MM-DD.md` or `cv-YYYY-MM-DD.tex` in repo root |

If target role is not given, produce a general-purpose CV.

---

## Output Format Auto-Detection

Run this decision tree **before scanning content**:

```
1. Does the repo contain .tex files with CV/resume content?
   YES → default output = latex (also produce markdown as secondary)
   NO  → default output = markdown

2. Did the user explicitly specify a format?
   YES → use that, ignore auto-detection result

3. If latex output: is pandoc available? (check: `which pandoc`)
   NO → warn user, fall back to markdown
```

**What counts as a CV/resume .tex file:**
- Filename matches (case-insensitive): `cv`, `resume`, `curriculum`, `vitae`
- OR file contains any of: `\section{Experience}`, `\cventry`, `\begin{rSection}`,
  `moderncv`, `\resumeItem`, `\resumeSubheading`, `\CVItem`

Always tell the user what was detected and which format will be used before proceeding.

---

## Step 1: Repo Scan

Same scan logic as cover-letter-builder — see that skill for full detail. Quick summary:

**Scan for:**
- `resume.*`, `cv.*`, `bio.*`, `about.*`, `profile.*` — any extension
- `*.md`, `*.txt`, `*.tex`, `*.rst` with personal/professional content
- `CLAUDE.md` for identity context
- Project READMEs for technical depth

**Skip:** `node_modules/`, `.git/`, `vendor/`, build artifacts, lock files, binaries

**Extract and bucket:**

```
Identity       → name, title/headline, location, contact, links (GitHub, LinkedIn, site)
Summary        → professional narrative, tagline
Experience     → employer, title, dates, responsibilities, outcomes, tech used
Projects       → name, description, tech stack, outcomes, links
Skills         → languages, tools, platforms, frameworks, domains
Education      → institution, degree, dates, notable coursework/thesis
Certifications → name, issuer, date
Publications   → optional
```

**Dedup:** if multiple files have overlapping content, merge and prefer the most specific/recent version.

---

## Step 2: Structure the CV

### Section order (general-purpose)

1. Header (name, title, contacts, links)
2. Summary (3-4 sentences max — optional, only if there's enough signal)
3. Experience (reverse-chronological)
4. Skills
5. Projects (if notable and not fully covered in Experience)
6. Education
7. Certifications (if relevant)

### Section order (technical/engineering roles)

1. Header
2. Skills (languages, tools, infra, platforms — grouped)
3. Experience
4. Projects
5. Education + Certs

### Section order (academic / research)

1. Header
2. Education
3. Publications / Research
4. Experience
5. Skills

Infer the appropriate order from the repo content and any target role provided. State which order was chosen and why.

---

## Step 3: Write Each Section

### Header
```markdown
# [Full Name]
[Title / Headline]

[City, Country] · [email] · [phone optional] · [github] · [linkedin] · [site]
```

### Summary
- 2-4 sentences
- State: what you do, how long, what you're known for, what you're aiming at
- No buzzwords, no "passionate", no "results-driven"
- Optional — omit if the experience section speaks for itself

### Experience entries

```markdown
## [Company Name] — [Title]
_[Start Month Year] – [End Month Year or Present]_

- [Outcome-first bullet: what changed because of you]
- [Scope signal: team size, system scale, $ impact if available]
- [Technical depth: stack, architecture decisions, constraints]
```

**Bullet rules:**
- Lead with verb in past tense (shipped, reduced, migrated, built, owned)
- Include at least one metric per role where data exists
- 3-5 bullets per role; 2 min for older/shorter roles
- Do not describe duties — describe outcomes and scope
- Avoid: "Responsible for", "Worked on", "Helped with"

### Skills

Group meaningfully:
```markdown
**Languages:** Rust, Go, TypeScript, Python, SQL
**Infrastructure:** Kubernetes, Terraform/OpenTofu, Ansible, FluxCD
**Databases:** PostgreSQL, Redis, ClickHouse
**Cloud:** AWS (EC2, RDS, EKS, S3), Hetzner
**Observability:** Prometheus, Grafana, Loki, Jaeger
```

Do not list skills that aren't evidenced somewhere in the repo.

### Projects

Only include if they add signal not already in Experience:

```markdown
## [Project Name]
_[Tech stack]_ · [Link if found]

[1-2 sentences: what it does and why it matters technically]
```

### Education

```markdown
## [Institution]
_[Degree], [Field]_ · [Year]
```

Short. No filler. Only notable coursework if it's directly relevant.

---

## Step 4: Anti-fluff Pass

Before finalizing, scan the draft for:

- [ ] Any bullets starting with "Responsible for" → rewrite
- [ ] Any "passionate", "results-driven", "team player", "detail-oriented" → delete
- [ ] Any vague scope ("large codebase", "complex systems") → add specifics or cut
- [ ] Skills listed without evidence in Experience/Projects → remove or flag
- [ ] Dates missing → flag for user to fill in
- [ ] Duplicate points across sections → consolidate

---

## Step 4b: Grammar & Quality Gate

Run this pass on the full CV draft **before writing to disk**. Fix in-place.

### Grammar checks

- Subject-verb agreement in all bullet points (even headless bullets imply a subject)
- Tense consistency: past tense for ended roles, present for current role only
- Article usage: "a" vs "an", no missing articles
- Preposition correctness ("experience in", not "experience on"; "proficient with", not "proficient in" for tools)
- Parallel structure within each role's bullet list — all bullets in a role should start with the same grammatical form (verb, noun phrase, etc.)
- Hyphenation: "full-stack", "cross-functional", "open-source", "real-time" when used as modifiers
- No comma splices in bullet points

### Bullet quality checks

- Every bullet starts with a strong past-tense verb for past roles, present-tense verb for current
- No bullet exceeds 25 words — if it does, split or cut
- Remove filler: "various", "multiple", "several", "many", "a number of", "etc."
- Remove hedging: "helped", "assisted with", "contributed to", "involved in" — own it or cut it
- At least one metric or concrete scope signal per role (team size, system scale, user count, % improvement, $ value)
- If no metric exists, the bullet must still answer: *so what?* — if it can't, cut it

### Section-level quality

- Summary (if present): reads as a person describing themselves, not a job posting describing a candidate
- Skills: no skill appears that isn't evidenced in at least one Experience or Project bullet
- Projects: each project entry justifies its inclusion — if it doesn't add signal beyond Experience, cut it
- Education: no filler coursework listed unless directly relevant to target role

### Quality bar

The CV passes when:
- Every bullet is outcome-oriented or scope-signaling — no duty descriptions
- A recruiter reading for 30 seconds can identify: what this person does, at what level, with what results
- Grammar is clean enough that nothing distracts from the content
- It is shorter rather than longer: one tight page worth of signal beats two pages of noise

If anything fails, fix it. Do not output a CV that doesn't clear this bar.

---

## Step 5: Output

### Format detection — run before writing

**Priority order:**

1. **User specified a format** (structure, section names, header style, etc.) → follow it exactly
2. **Existing CV file found in repo** → extract its structural conventions and mirror them:
   - Section names and order as-is (don't rename "Work Experience" to "Experience")
   - Header/contact block layout
   - Date format (`Jan 2022`, `2022-01`, `January 2022` — whatever is used)
   - Delimiter style (horizontal rules, blank lines, LaTeX `\section` vs `\subsection`)
   - Bullet style (dashes, `\item`, asterisks)
3. **No prior format found** → use the defaults below

When mirroring an existing format: only update content, never restructure the skeleton. If the existing format has a flaw (e.g. a section in a bad order), note it to the user but do not silently "fix" it.

### Markdown CV

Filename: `cv-YYYY-MM-DD.md`

Write to the current working directory (or repo root).

Must render cleanly in GitHub, Pandoc/md-to-pdf pipelines, and ATS parsers.

**ATS rules (apply only when not mirroring an existing format):**
- `##` for section headers — no decorative characters
- No tables for experience/skills — use grouped lists
- No multi-column layouts
- Contact info in plain text only

### LaTeX CV

Filename: `cv-YYYY-MM-DD.tex`

Used when auto-detected or explicitly requested. See `references/latex-template.md`
for the base template and compilation instructions.

If the source repo already has a `.tex` CV, preserve the document class and preamble
style — only update content sections. Do not switch from e.g. `moderncv` to a bare
`article` class unless the user asks.

### When producing both

Write both files. In the report, lead with the format that was auto-detected as primary.

---

## Step 6: Report to User

After writing:

1. Output path
2. Render the full CV inline for review
3. List top sources used per section (filename → what was extracted)
4. Flag:
   - Missing dates
   - Roles with no metrics found
   - Skills listed but not evidenced
   - Anything that needs the user to fill in manually

---

## Edge Cases

| Situation | Handling |
|---|---|
| No relevant files found | Ask user to provide their background inline; offer a structured intake interview |
| Only code files, no prose | Infer projects from READMEs; ask for experience context |
| Multiple CV versions | Merge; prefer most recent; flag conflicts |
| Dates ambiguous or missing | Include what's there; mark `[DATE NEEDED]` |
| LaTeX auto-detected or requested, pandoc unavailable | Produce Markdown only; warn user; explain how to install pandoc or compile the .tex manually |
| Source repo uses a specific LaTeX class (moderncv, etc.) | Preserve that class/style; update content only |
| Target role given | Reorder sections accordingly; emphasize matching skills |
| No metrics in experience | Note it; write outcome-focused bullets anyway; suggest user add numbers |
