# LaTeX CV Template Reference

## Base Template

ATS-friendly single-column layout. Compile with `xelatex` (preferred) or `pdflatex`.

```latex
\documentclass[10pt,a4paper,final]{article}

\usepackage[
  top=1.5cm, bottom=1.5cm,
  left=1.8cm, right=1.8cm
]{geometry}

% ── Font & encoding ─────────────────────────────────────────────────────────
% fontspec (XeLaTeX/LuaLaTeX) for full Unicode support.
% Falls back to fontenc+inputenc for pdflatex.
\usepackage{iftex}
\ifXeTeX
  \usepackage{fontspec}
  \setmainfont{TeX Gyre Termes}   % Times-compatible, broadly available
\else
  \usepackage[T1]{fontenc}
  \usepackage[utf8]{inputenc}
\fi

\usepackage{microtype}            % Reduces overfull hboxes, cleaner text flow

\usepackage[
  colorlinks=true,
  urlcolor=black,
  linkcolor=black,
  hidelinks
]{hyperref}

\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{parskip}

% ── Section formatting ───────────────────────────────────────────────────────
% Uppercase headers help ATS parsers identify section boundaries reliably.
\titleformat{\section}
  {\large\bfseries\MakeUppercase}
  {}
  {0em}
  {}
  [\vspace{-4pt}\hrule\vspace{2pt}]

\titlespacing{\section}{0pt}{12pt}{4pt}

% ── List formatting ──────────────────────────────────────────────────────────
\setlist[itemize]{
  noitemsep,
  topsep=2pt,
  leftmargin=1.2em,
  label=\textbullet
}

% ── Helper commands ──────────────────────────────────────────────────────────

% \cventry{Company}{Title}{Date Range}
% Produces:  Company Name             Start – End
%            Title (italic)
\newcommand{\cventry}[3]{%
  \textbf{#1} \hfill \textit{#3} \\
  \textit{#2}%
}

\pagestyle{empty}

% ── Document ─────────────────────────────────────────────────────────────────
\begin{document}

% ── Header ───────────────────────────────────────────────────────────────────
\begin{center}
  {\LARGE\textbf{[Full Name]}}\\[4pt]
  [Title / Headline]\\[4pt]
  [City, Country]
  \,\textbar\,
  \href{mailto:[email]}{[email]}
  \,\textbar\,
  \href{https://github.com/[handle]}{github.com/[handle]}
  \,\textbar\,
  \href{https://[site]}{[site]}
\end{center}

\vspace{4pt}

% ── Summary ──────────────────────────────────────────────────────────────────
% Optional. Omit if experience section speaks for itself.
\section{Summary}

[2--3 sentences. What you do, at what level, where you're headed. No buzzwords.]

% ── Experience ───────────────────────────────────────────────────────────────
\section{Experience}

\cventry{[Company Name]}{[Title]}{[Mon Year] -- [Mon Year or Present]}
\begin{itemize}
  \item [Outcome-first bullet with metric — what changed because of you]
  \item [Scope signal: team size, system scale, \$~impact if available]
  \item [Technical depth: stack, architecture decision, constraint solved]
\end{itemize}

\medskip

\cventry{[Company Name]}{[Title]}{[Mon Year] -- [Mon Year]}
\begin{itemize}
  \item [Outcome-first bullet]
  \item [Scope or technical depth]
\end{itemize}

% ── Skills ───────────────────────────────────────────────────────────────────
\section{Skills}

\begin{itemize}[leftmargin=0pt, label={}, itemsep=1pt]
  \item \textbf{Languages:}       Go, TypeScript, Python, Rust, SQL
  \item \textbf{Infrastructure:}  Kubernetes, OpenTofu/Terraform, Ansible, FluxCD
  \item \textbf{Databases:}       PostgreSQL, Redis, ClickHouse
  \item \textbf{Cloud:}           AWS (EKS, RDS, S3, EC2), GCP, Hetzner
  \item \textbf{Observability:}   Prometheus, Grafana, Loki, OpenTelemetry
\end{itemize}

% ── Projects ─────────────────────────────────────────────────────────────────
% Omit if fully covered by Experience.
\section{Projects}

\textbf{[Project Name]}
\hfill \href{[url]}{[url]}\\
\textit{[Tech stack]}

[1--2 sentences: what it does and why it matters technically.]

% ── Education ────────────────────────────────────────────────────────────────
\section{Education}

\textbf{[Institution]} \hfill [Year]\\
\textit{[Degree], [Field]}

% ── Certifications ───────────────────────────────────────────────────────────
% Optional. Remove section if none.
\section{Certifications}

\textbf{[Cert Name]} --- [Issuer] \hfill [Year]

\end{document}
```

## Compilation

```bash
# Preferred — full Unicode, best typography
xelatex cv.tex

# Standard pdflatex (ASCII/Latin names only — no special chars in name/content)
pdflatex cv.tex

# From Markdown source via pandoc
pandoc cv.md -o cv.pdf --pdf-engine=xelatex \
  -V geometry:margin=1.8cm \
  -V fontsize=10pt
```

## ATS Compatibility Notes

- **Single column only** — multi-column layouts confuse most ATS parsers
- **Uppercase section headers** — `\MakeUppercase` ensures consistent capitalization ATS relies on to identify boundaries (`EXPERIENCE`, `SKILLS`, etc.)
- **No tables for experience/skills** — use `itemize` lists; tables are often parsed as a single cell
- **No TikZ, PGF, or graphics** in the body — purely typographic layout
- **`hidelinks`** — avoids coloured link boxes on print/PDF copy
- **`microtype`** — improves text flow and reduces hyphenation artifacts that confuse text extraction
- **`\textbar`** in header instead of `|` — avoids rare ligature issues in some PDF-to-text extractors
- Always produce the Markdown version alongside LaTeX for ATS submissions that reject PDFs

## Font Notes

- `TeX Gyre Termes` is a free Times New Roman-compatible font available in most TeX distributions; swap with `Latin Modern Roman` or `TeX Gyre Pagella` if preferred
- If the name contains non-ASCII characters (accented letters, CJK, etc.), `xelatex` with `fontspec` is required — `pdflatex` will silently drop or mangle them
- Replace `\setmainfont{TeX Gyre Termes}` with any system font name when using `xelatex`
