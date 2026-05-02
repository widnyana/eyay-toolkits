---
name: cv-builder
description: >
  Build or update a Curriculum Vitae (CV) by scanning a repo for the person's background
  (experience, skills, education, projects — from plain text, Markdown, LaTeX, or any
  prose file). Outputs a polished, ATS-friendly Markdown CV and optionally a LaTeX or
  PDF-ready version. Adapts format to target region and remote vs. local hire context.
  Use this skill whenever the user asks to build a CV, update their resume, create a
  curriculum vitae, or consolidate their background into a structured document — even if
  they just say "make me a CV from this repo" or "build my resume".
---

# CV Builder

## Inputs

| Field | Required | Notes |
|---|---|---|
| Repo path | Yes (default: `.`) | Where to scan for background info |
| Job posting / target role | No | Tailors section ordering, emphasis, and keyword match |
| Company name + HQ location | No | Drives regional format detection (Step 0) |
| Output format | No | Auto-detected (see below); override with `markdown`, `latex`, or `both` |
| Output path | No | Default: `cv-YYYY-MM-DD.md` or `cv-YYYY-MM-DD.tex` in repo root |

If target role is not given, produce a general-purpose CV.

---

## Step 0: Region & Format Mode Detection

Run this **before any scanning**. The result controls format decisions throughout.

### Detect application context

```
1. Is this a remote role?
   - "Remote", "fully remote", "distributed", "work from anywhere" in job posting → YES
   - No location mentioned or multiple global locations → likely YES
   - On-site / hybrid explicitly stated → NO → use regional mode

2. What is the company's primary HQ region?
   - Extract from job posting, company name, or user input
   - Use the table below to select regional mode
   - If remote role at a globally-distributed company → use REMOTE-UNIVERSAL mode
```

### Regional mode table

| Company HQ / Context | Mode | Key constraints |
|---|---|---|
| Remote-first / globally distributed | **REMOTE-UNIVERSAL** | 1-2 pages, no photo, no personal data, visa clarity required |
| US / Canada | **NA** | No photo, no DOB/marital status, 1 page (<5 yrs) or 2 pages |
| UK / Ireland | **UK** | 2 pages, personal statement at top, no photo |
| Germany / Austria / Switzerland | **DACH** | Professional photo expected, 2-3 pages, detailed structure |
| Netherlands / Scandinavia | **NL-SCAN** | English OK, 1-2 pages, no photo, matter-of-fact tone |
| France / Southern Europe | **FR-EU** | Photo common but optional, 1-2 pages, objective required |
| Singapore / Australia / NZ | **APAC-INT** | Western-aligned, 2 pages, include work authorization status |
| Japan (multinational) | **APAC-INT** | Western format for international roles; rikyousho only if local |
| India → international role | **NA** | Strip traditional Indian fields (photo, DOB, father's name, declaration) |
| Latin America → international | **NA** | English CV, strip local fields (CPF, marital status, DOB) |
| Gulf / Middle East | **GCC** | Photo standard, 2-4 pages, nationality + visa status required |
| Africa → international | **NA** | Compress to 1-2 pages, strip local verbose format |

**When in doubt:** if the role is remote or the company is a multinational tech firm, default to **REMOTE-UNIVERSAL**.

State the detected mode to the user before proceeding.

### REMOTE-UNIVERSAL requirements (most common for this skill)

- 1 page for < 7 years experience; 2 pages max for senior/staff+
- No photo
- No DOB, marital status, nationality, religion
- **Visa / work authorization** — include one line in the header if not obvious:
  `Work authorization: [Country] citizen / [Visa type, expiry if relevant] / open to sponsorship`
- Timezone and async availability — note in header or summary if relevant to the role
- Skills section appears **before** Experience for technical roles (ATS advantage)
- Apply within 72 hours of posting going live — note this to the user

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

**Scan for:**
- `resume.*`, `cv.*`, `bio.*`, `about.*`, `profile.*` — any extension
- `*.md`, `*.txt`, `*.tex`, `*.rst` with personal/professional content
- `CLAUDE.md` for identity context
- Project READMEs for technical depth

**Skip:** `node_modules/`, `.git/`, `vendor/`, build artifacts, lock files, binaries

**Extract and bucket:**

```
Identity        → name, title/headline, location, contact, links (GitHub, LinkedIn, site)
Summary         → professional narrative, tagline
Experience      → employer, title, dates, responsibilities, outcomes, tech used;
                  note if roles were remote
Projects        → name, description, tech stack, outcomes, links
Skills          → languages, tools, platforms, frameworks, domains
Education       → institution, degree, dates, notable coursework/thesis
Certifications  → name, issuer, date
Publications    → optional
```

**Dedup:** if multiple files have overlapping content, merge and prefer the most specific/recent version.

---

## Step 2: Structure the CV

### Section order — REMOTE-UNIVERSAL / NA / NL-SCAN / APAC-INT (technical role)

1. Header (name, title, contacts, links, work authorization if needed)
2. Skills (languages, tools, infra, platforms — **first** for ATS keyword density)
3. Experience (reverse-chronological)
4. Projects (if notable and not fully covered in Experience)
5. Education
6. Certifications (if relevant)

### Section order — UK / FR-EU

1. Header
2. Personal Statement (3-5 sentences, keyword-rich)
3. Experience
4. Skills
5. Projects
6. Education + Certs

### Section order — DACH (Germany / Austria / Switzerland)

1. Header with professional photo placeholder note
2. Personal details block (as expected by regional norm)
3. Professional Summary
4. Experience
5. Education
6. Skills
7. Certifications

### Section order — academic / research

1. Header
2. Education
3. Publications / Research
4. Experience
5. Skills

Infer the appropriate order from the repo content, detected mode, and any target role provided. State which order was chosen and why.

---

## Step 3: Write Each Section

### Header

```markdown
# [Full Name]
[Title / Headline]

[City, Country] · [email] · [github] · [linkedin] · [site]
Work authorization: [status]
```

Include the work authorization line only when it is not obvious — e.g., applying across borders, visa sponsorship needed, or the job posting asks. Omit it otherwise; it wastes space when it adds no information.

### Personal Statement (UK / FR-EU mode only)

- 3-5 sentences at the top
- Lead with years of experience + domain + strongest outcome
- Embed 3-5 keywords from the job description naturally
- No buzzwords: "passionate", "results-driven", "team player"

### Summary (optional — REMOTE-UNIVERSAL)

- 2-4 sentences only
- State: what you do, at what level, what you're known for, what you're aiming at
- Omit if the Experience section speaks for itself

### Skills (appears first in REMOTE-UNIVERSAL tech roles)

Group meaningfully. Only list skills evidenced somewhere in the repo. Categories vary — use what fits the actual background.

```markdown
**Languages:** Go, TypeScript, Python, Rust, SQL
**Infrastructure:** Kubernetes, OpenTofu/Terraform, Ansible, FluxCD
**Databases:** PostgreSQL, Redis, ClickHouse
**Cloud:** AWS (EKS, RDS, S3, EC2), GCP, Hetzner
**Observability:** Prometheus, Grafana, Loki, OpenTelemetry
```

### Experience entries (STAR+Q format)

Every bullet must follow **STAR+Q**: Situation context where needed → Task/Action → Result → Quantified metric.

```markdown
## [Company Name] — [Title]
_[Start Month Year] – [End Month Year or Present]_

- [Strong verb] [what you built/changed] → [outcome with metric]
- [Scope signal: team size, system scale, $ impact, user count]
- [Technical depth: stack decision, architecture constraint, tradeoff navigated]
```

**Bullet rules:**
- Lead with strong past-tense verb: shipped, reduced, migrated, built, owned, led, cut, grew
- At least one metric per role — `%`, `$`, `x users`, `ms`, `hrs/week`, `team of N`
- 3-5 bullets per role; 2 minimum for older/shorter roles
- Outcome over duty: never "Responsible for" — always what changed because of you
- If the role was remote, note it after the date: `_Jan 2022 – Present · Remote_`

### Projects

Only include if they add signal not already in Experience:

```markdown
## [Project Name]
_[Tech stack]_ · [Link if found]

[1-2 sentences: what it does, why it matters technically, outcome or scale.]
```

### Education

```markdown
## [Institution]
_[Degree], [Field]_ · [Year]
```

Short. No filler. Only notable coursework if directly relevant to target role.

---

## Step 4: Anti-fluff Pass

Before finalizing, scan the draft for:

- [ ] Any bullets starting with "Responsible for" → rewrite as outcome
- [ ] "Passionate", "results-driven", "team player", "detail-oriented" → delete
- [ ] Vague scope ("large codebase", "complex systems") → add specifics or cut
- [ ] Skills listed without evidence in Experience/Projects → remove or flag
- [ ] Dates missing → flag `[DATE NEEDED]`
- [ ] Duplicate points across sections → consolidate
- [ ] "Worked on", "helped with", "assisted", "contributed to" → own it or cut it
- [ ] Any sentence over 25 words in a bullet → split or cut

---

## Step 5: Grammar & Quality Gate

Run this pass on the full CV draft **before writing to disk**. Fix in-place.

### Grammar checks

- Subject-verb agreement in all bullet points
- Tense consistency: past tense for ended roles, present for current role only
- Article usage: "a" vs "an", no missing articles
- Preposition correctness ("experience in", "proficient with" for tools)
- Parallel structure within each role's bullet list
- Hyphenation: "full-stack", "cross-functional", "open-source", "real-time" as modifiers
- No comma splices in bullet points

### Bullet quality checks

- Every bullet starts with a strong verb
- No bullet exceeds 25 words — split or cut
- Remove filler: "various", "multiple", "several", "many", "etc."
- Remove hedging: "helped", "assisted with", "contributed to" — own it or cut it
- At least one metric or concrete scope signal per role
- If no metric exists, the bullet must answer: *so what?* — if it can't, cut it

### Section-level quality

- Skills: nothing listed that isn't evidenced in at least one Experience or Project bullet
- Projects: each entry justifies inclusion; cut if redundant with Experience
- Education: no filler coursework unless directly relevant

### Quality bar

The CV passes when:
- Every bullet is outcome-oriented or scope-signaling
- A recruiter reading for 30 seconds can identify: what this person does, at what level, with what results
- Grammar is clean; nothing distracts from content
- It is shorter rather than longer

---

## Step 6: Output

### Format detection — run before writing

**Priority order:**

1. **User specified a format** → follow it exactly
2. **Existing CV file found in repo** → mirror its structural conventions:
   - Section names and order as-is
   - Header/contact block layout
   - Date format
   - Delimiter style
   - Bullet style
3. **No prior format found** → use defaults below

When mirroring: update content only, never restructure the skeleton. Note any structural issues to the user but do not silently fix them.

### Markdown CV

Filename: `cv-YYYY-MM-DD.md`

**ATS rules (when not mirroring):**
- `##` for section headers — no decorative characters
- No tables for experience/skills — use grouped lists
- No multi-column layouts
- Contact info in plain text only

### LaTeX CV

Filename: `cv-YYYY-MM-DD.tex`

See `references/latex-template.md` for base template and compilation instructions.
Always run `pdftotext cv.pdf - | head -80` to verify ATS extraction before submitting.

If source repo has an existing `.tex` CV, preserve the document class and preamble — only update content sections.

### When producing both

Write both files. Lead with the format that was auto-detected as primary.

---

## Step 7: Report to User

After writing:

1. Output path(s)
2. Detected region mode and why
3. Render the full CV inline for review
4. List top sources used per section (filename → what was extracted)
5. Flag:
   - Missing dates
   - Roles with no metrics found
   - Skills listed but not evidenced
   - Work authorization not found in repo if cross-border role (prompt user to add)
   - Gaps vs. job description keywords

---

## Edge Cases

| Situation | Handling |
|---|---|
| No relevant files found | Ask user to provide their background inline; offer a structured intake interview |
| Only code files, no prose | Infer projects from READMEs; ask for experience context |
| Multiple CV versions | Merge; prefer most recent; flag conflicts |
| Dates ambiguous or missing | Include what's there; mark `[DATE NEEDED]` |
| LaTeX auto-detected or requested, pandoc unavailable | Produce Markdown only; warn user; explain manual compile |
| Source repo uses a specific LaTeX class (moderncv, etc.) | Preserve class/style; update content only |
| Target role given | Reorder sections; emphasize matching skills |
| No metrics in experience | Note it; write outcome-focused bullets; suggest user add numbers |
| DACH mode triggered | Note that a professional photo placeholder is needed; do not auto-insert |
| India/LATAM → international role | Explicitly strip traditional regional fields (DOB, photo, declaration) and note this to the user |
| GCC mode | Include nationality and visa status fields; flag if not found in repo |

