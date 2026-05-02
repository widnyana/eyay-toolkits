# career-tools

Claude Code plugin for building career documents. Scans a repo for background information and produces polished, ATS-friendly output.

## Skills

### `cover-letter-builder`

Builds a tailored cover letter by matching your background (from files in the current repo) to a job posting.

**Trigger:** ask to write a cover letter, draft an application, or paste a job description.

**Output:** `YYYY-MM-DD-company-position.md`

---

### `cv-builder`

Builds or updates a CV by scanning a repo for experience, skills, education, and projects.

**Trigger:** ask to build a CV, update a resume, or consolidate background into a structured document.

**Output:** `cv-YYYY-MM-DD.md` (Markdown) and/or `cv-YYYY-MM-DD.tex` (LaTeX, auto-detected or on request)

LaTeX output uses the ATS-optimised template in `skills/cv-builder/references/latex-template.md`.
Always run `pdftotext cv.pdf - | head -80` to verify extraction before submitting.

## Installation

```
/plugin career-tools
```
