# LaTeX CV Template Reference

## Base Template

Use this as the starting point for a LaTeX CV. Compile with `pdflatex` or `xelatex`.

```latex
\documentclass[11pt,a4paper]{article}

\usepackage[margin=1.8cm]{geometry}
\usepackage{hyperref}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{parskip}
\usepackage{fontenc}
\usepackage{inputenc}

% Section formatting
\titleformat{\section}{\large\bfseries}{}{0em}{}[\titlerule]
\titlespacing{\section}{0pt}{10pt}{4pt}

% No page numbers
\pagestyle{empty}

% Compact lists
\setlist[itemize]{noitemsep, topsep=2pt, leftmargin=*}

\begin{document}

% ── Header ──────────────────────────────────────────────────────────────
{\LARGE \textbf{[Full Name]}} \\[2pt]
[Title / Headline] \\[4pt]
[City, Country] \textbullet{}
\href{mailto:[email]}{[email]} \textbullet{}
\href{https://github.com/[handle]}{github.com/[handle]} \textbullet{}
\href{https://[site]}{[site]}

\section{Experience}

\textbf{[Company Name]} \hfill [Start] -- [End] \\
\textit{[Title]}
\begin{itemize}
  \item [Outcome-first bullet with metric]
  \item [Scope or technical depth]
  \item [Third point if warranted]
\end{itemize}

\section{Skills}

\begin{itemize}[leftmargin=0pt, label={}]
  \item \textbf{Languages:} Rust, Go, TypeScript, Python, SQL
  \item \textbf{Infrastructure:} Kubernetes, OpenTofu, Ansible, FluxCD
  \item \textbf{Databases:} PostgreSQL, Redis, ClickHouse
  \item \textbf{Cloud:} AWS (EC2, RDS, EKS, S3), Hetzner
\end{itemize}

\section{Projects}

\textbf{[Project Name]} \hfill \href{[url]}{[url]} \\
\textit{[Tech stack]}

[1-2 sentence description]

\section{Education}

\textbf{[Institution]} \hfill [Year] \\
\textit{[Degree], [Field]}

\end{document}
```

## Compilation

```bash
# Standard
pdflatex cv.tex

# Better Unicode support
xelatex cv.tex

# With pandoc from Markdown
pandoc cv.md -o cv.pdf --pdf-engine=xelatex \
  -V geometry:margin=1.8cm \
  -V fontsize=11pt
```

## Notes

- Prefer `xelatex` if the name contains non-ASCII characters
- If `fontenc`/`inputenc` cause issues with `xelatex`, replace with `\usepackage{fontspec}`
- `titlesec` + `parskip` combination keeps section spacing tight without manual `\vspace`
- For ATS compatibility, also always produce the Markdown version
