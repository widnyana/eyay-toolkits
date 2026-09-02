# agent-notify

pi / omp extension that fires OS notifications when the agent needs you, so you
can leave the terminal and still know when to come back.

| Event | Notification |
|---|---|
| Run finished (`session_stop`) | "Agent finished — run complete, awaiting your input" |
| Approval dialog open (`tool_approval_requested`) | "Approval needed: \<tool name\>" |
| Provider retry (`auto_retry_start`) | "Retrying request — attempt N" |

Delivery is fire-and-forget and can never block the agent loop: if the
notifier is missing or fails, the extension logs and drops the event.
Identical notifications are throttled to one per 30 s per kind.

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

## Icon

The package ships `assets/icon.png` for **Linux** (`notify-send -i <icon
path>`; needs any freedesktop notification daemon — GNOME, KDE, dunst, mako, …).

**macOS**: the banner icon cannot be customized — Apple provides no API; it
always comes from the sending app bundle. Install `terminal-notifier` (brew)
for click-to-focus: clicking the notification activates your terminal
(detected via `TERM_PROGRAM`: Ghostty, iTerm2, Terminal, VS Code, WezTerm,
kitty). Without `terminal-notifier`, delivery falls back to
`osascript display notification`. Other platforms: the extension registers
nothing and logs why.

The notification text is passed as exec args (never a shell string), so
agent-controlled content can't become a command.

## Tests

```bash
cd pi-packages/agent-notify && bun test
```
