# agent-notify

pi / omp extension that fires a banner when the agent needs you, so you can
leave the terminal and still know when to come back. Terminal capabilities
only: delivery is an OSC escape sequence written to the controlling tty, or
an OS notifier executed via argv. `osascript` is deliberately not used.

| Event | Notification |
|---|---|
| Run finished (`agent_settled` / `session_stop`) | "Agent finished: run complete, awaiting your input" |
| Approval dialog open (omp only, `tool_approval_requested`) | "Approval needed: \<tool name\>" |
| UI prompt open (pi only, `ui_prompt_start`) | "Input needed: \<prompt title\>" |
| Provider retry (omp only, `auto_retry_start`) | "Retrying request, attempt N" |

## Channel decision table

| Platform | Terminal | Channel |
|---|---|---|
| any | kitty | OSC 99 |
| any | iTerm2 | OSC 9 |
| macOS | anything else | OSC 777 (Ghostty/WezTerm/rxvt render it; others ignore it) |
| Windows | Windows Terminal (`WT_SESSION`) | PowerShell toast |
| Linux/BSD | Ghostty / WezTerm | OSC 777 |
| Linux/BSD | unknown terminal | `notify-send` (uses `assets/icon.png`) |

The startup log line `agent-notify: channel=<name>` answers "why no banner?".

## Behavior

- Fire-and-forget: delivery failure is logged and dropped, never thrown into
  the agent loop. Spawn and tty errors are attached listeners/catches, not
  unhandled events.
- One banner per kind per 30 s (`done` / `attention` / `input` are throttled
  independently; `input` banners are keyed per tool or prompt). Retry storms collapse to one banner.
- `stop_hook_active` on `session_stop` means the agent resumed, not settled:
  no banner.
- Notification text travels as exec argv (never a shell string); tool names
  from events are stripped of control characters and capped at 80 chars.
- No `stdout` fallback: if `/dev/tty` is unavailable, the banner is dropped
  and logged. Writing escape sequences into a piped stdout would corrupt it
  and nothing renders there.

## Install

```bash
pi install npm:@widnyana/agent-notify
# or via OMP
omp install npm:@widnyana/agent-notify
```

From a local checkout:

```bash
pi install /path/to/eyay-toolkits/pi-packages/agent-notify
# or via OMP
omp install /path/to/eyay-toolkits/pi-packages/agent-notify
```

## Tests

```bash
cd pi-packages/agent-notify && bun test
```
