# LaTeX CV Template Reference

## Design Principles

- **ATS-safe**: linear reading order, no tables, no text boxes, no `\hfill` for
  critical fields, no multi-column layouts, no decorative separators that
  confuse parsers, all text extractable via `pdftotext`
- **Human-readable**: clean typographic hierarchy, generous but tight spacing,
  scannable in under 30 seconds
- **`xelatex` first**: handles Unicode names, non-ASCII characters, system fonts
- **Single file**: no external class dependencies beyond standard CTAN packages

---

## Base Template

```latex
% ============================================================
%  CV — ATS-friendly + human-readable
%  Compile: xelatex cv.tex  (or pdflatex if no Unicode needed)
% ============================================================
\documentclass[11pt, a4paper]{article}

% ── Page geometry ────────────────────────────────────────────
\usepackage[
  top=1.6cm, bottom=1.6cm,
  left=2.0cm, right=2.0cm
]{geometry}

% ── Font stack ───────────────────────────────────────────────
\usepackage{ifxetex}
\ifxetex
  \usepackage{fontspec}
  \setmainfont{Linux Libertine O}[
    BoldFont       = Linux Libertine O Bold,
    ItalicFont     = Linux Libertine O Italic,
    BoldItalicFont = Linux Libertine O Bold Italic
  ]
  % Fallback if Libertine not installed — uncomment one:
  % \setmainfont{Georgia}
  % \setmainfont{DejaVu Serif}
  % \setmainfont{TeX Gyre Termes}
\else
  % pdflatex path
  \usepackage[T1]{fontenc}
  \usepackage[utf8]{inputenc}
  \usepackage{libertine}
\fi

% ── Core packages ────────────────────────────────────────────
\usepackage{hyperref}
\hypersetup{
  colorlinks = true,
  urlcolor   = black,
  linkcolor  = black,
  hidelinks           % removes colored boxes; links still clickable in PDF
}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{parskip}
\usepackage{microtype}
\usepackage{xcolor}

% ── Section formatting ───────────────────────────────────────
% ALL-CAPS: maximally consistent ATS heading detection
% Rule under heading: visual hierarchy without a table
\titleformat{\section}
  {\large\bfseries\uppercase}
  {}
  {0em}
  {}
  [\vspace{-6pt}\rule{\linewidth}{0.5pt}\vspace{2pt}]

\titlespacing{\section}{0pt}{12pt}{4pt}

% ── List style ───────────────────────────────────────────────
% En-dash label: extracts as plain "-" in ATS; cleaner than bullet glyph
\setlist[itemize]{
  noitemsep,
  topsep     = 2pt,
  parsep     = 0pt,
  leftmargin = 1.4em,
  label      = \textendash
}

% ── Misc ─────────────────────────────────────────────────────
\pagestyle{empty}
\setlength{\parindent}{0pt}

% ── Helper macros ────────────────────────────────────────────

% \roleentry{Company}{Title}{Date range}
% Date on same line as title — avoids \hfill whitespace confusing ATS parsers
\newcommand{\roleentry}[3]{%
  \textbf{#1}\\
  \textit{#2}\hspace{0.6em}{\small\color{black!55}#3}\\[-4pt]
}

% \projectentry{Name}{Tech stack}{URL}  — pass {} for URL to omit
\newcommand{\projectentry}[3]{%
  \textbf{#1}\ifx&#3&\else\hspace{0.6em}{\small\href{#3}{#3}}\fi\\
  \textit{#2}\\[-4pt]
}

% ============================================================
\begin{document}

% ── HEADER ───────────────────────────────────────────────────
% Each field on its own line — ATS extracts in correct reading order
{\LARGE\textbf{[Full Name]}}\\[3pt]
{\large [Title / Headline]}\\[5pt]
[City, Country]\\
\href{mailto:[email]}{[email]}\\
\href{https://github.com/[handle]}{github.com/[handle]}\\
\href{https://[personal-site]}{[personal-site]}\\        % omit if unused
\href{https://linkedin.com/in/[handle]}{linkedin.com/in/[handle]}  % omit if unused

\vspace{6pt}
\rule{\linewidth}{0.4pt}
\vspace{2pt}

% ── SUMMARY (optional) ───────────────────────────────────────
% Only include if 2-3 sentences add real signal. Cut if it would be generic.
%
% \section{Summary}
% [What you do, at what level, with what results. No buzzwords.]

% ── EXPERIENCE ───────────────────────────────────────────────
\section{Experience}

\roleentry{[Company Name]}{[Title]}{[Mon YYYY] -- [Mon YYYY or Present]}
\begin{itemize}
  \item [Outcome-first. Verb + result + scope. One concrete metric minimum.]
  \item [Technical depth: architecture decision, scale, constraint navigated.]
  \item [Third bullet only if it adds distinct signal — otherwise cut.]
\end{itemize}

\vspace{4pt}

\roleentry{[Company Name]}{[Title]}{[Mon YYYY] -- [Mon YYYY]}
\begin{itemize}
  \item [Outcome-first bullet.]
  \item [Scope or impact signal.]
\end{itemize}

% ── SKILLS ───────────────────────────────────────────────────
\section{Skills}

% Label-colon list: ATS reads as plain key-value; human reads as grouped table
\begin{itemize}[label={}, leftmargin=0pt]
  \item \textbf{Languages:}      [Rust, Go, TypeScript, Python, SQL]
  \item \textbf{Infrastructure:} [Kubernetes, OpenTofu, Ansible, FluxCD, SOPS]
  \item \textbf{Databases:}      [PostgreSQL, Redis, ClickHouse]
  \item \textbf{Cloud:}          [AWS (EC2, RDS, EKS, S3), Hetzner]
  \item \textbf{Observability:}  [Prometheus, Grafana, Loki, Jaeger]
  % Add/remove categories to match actual experience. Never list what you can't speak to.
\end{itemize}

% ── PROJECTS (optional) ──────────────────────────────────────
% Include only if they add signal not already in Experience.
% Cut the whole section if Experience covers it.
%
\section{Projects}

\projectentry{[Project Name]}{[Tech stack]}{https://github.com/[handle]/[repo]}
[1-2 sentences. What it does, why technically interesting, outcome or scale.]

\vspace{4pt}

\projectentry{[Project Name]}{[Tech stack]}{}
[1-2 sentences.]

% ── EDUCATION ────────────────────────────────────────────────
\section{Education}

\textbf{[Institution]}\\
\textit{[Degree], [Field]}\hspace{0.6em}{\small\color{black!55}[Year]}
% Add relevant coursework only if it directly supports the target role.

% ── CERTIFICATIONS (optional) ────────────────────────────────
% \section{Certifications}
% \textbf{[Cert Name]} --- [Issuer], [Year]

\end{document}
```

---

## ATS Compliance Decisions

Each choice is intentional — understand the tradeoff before changing it.

| Decision | Why |
|---|---|
| Header fields on separate lines | Parsers split on newlines reliably; mid-line `\textbullet` separators get absorbed into the field value |
| Date inline with title via `\hspace`, not `\hfill` | `\hfill` produces whitespace that pushes the date to extracted-text limbo; inline keeps it adjacent to the role |
| ALL-CAPS section headings | Most consistent heading detection across ATS parsers regardless of case sensitivity |
| `\textendash` bullets | Extracts as `-` in `pdftotext`; `\textbullet` often extracts as `•` or garbage depending on font encoding |
| No tables, `multicol`, or text boxes | These break reading order on text extraction — content appears out of sequence or drops entirely |
| Skills as label-colon list, not a table | LaTeX tables extract column-by-column, not row-by-row; a flat list with bold labels is both scannable and correctly ordered |
| `hidelinks` + `urlcolor=black` | Clickable in PDF; prints neutral; ATS sees the URL string directly |

---

## Compilation

```bash
# Preferred — Unicode support, system fonts
xelatex cv.tex

# pdflatex — portable, no system font dependency
pdflatex cv.tex

# Verify ATS extraction before submitting anywhere
pdftotext cv.pdf - | head -80
```

**Always run the `pdftotext` check.** The extracted output should read: name → contact → sections in order → bullets under each role. If anything is missing, out of order, or garbled, fix the source — do not submit a PDF you haven't verified.

---

## Font Availability

```bash
# Fedora / RHEL — install Libertine
sudo dnf install linux-libertine-fonts

# Verify fontspec can find it
fc-list | grep -i libertine
```

If Libertine is unavailable, safe fallbacks in order of preference:
- `TeX Gyre Termes` — always present in a full TeX Live install, Times-like
- `DejaVu Serif` — widely available on Linux
- `Georgia` — macOS/Windows system font
