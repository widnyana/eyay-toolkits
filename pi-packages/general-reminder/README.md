# general-reminder

Configurable standing reminders for [pi](https://pi.dev) / [omp](https://omp.sh).

Drop a `reminders.json` in the project and every agent run gets its contents
injected into the system prompt. The path depends on the harness:

| Harness | Config file |
|---|---|
| omp | `<project>/.omp/reminders.json` |
| pi | `<project>/.pi/reminders.json` |

## Shape

```json
{
  "reminders": [
    "Plain text — injected on every run",
    { "text": "One-shot note shown only on the first run of a session", "once": true }
  ]
}
```

- Bare strings are **always-on**: injected before every run.
- `once: true` entries fire on the **first run of the session** only.
- Missing file → the extension does nothing (fully opt-in).
- Malformed JSON → skipped with one warning per session.
- More than 20 entries → only the first 20 load.
- Flags reset on `session_start`; edit the file, then restart or switch
  sessions to pick changes up (no mid-session hot reload).

## Install

```bash
pi install /path/to/eyay-toolkits/pi-packages/general-reminder
# or via OMP
omp install /path/to/eyay-toolkits/pi-packages/general-reminder
```

OMP marketplace:

```bash
omp plugin marketplace add widnyana/eyay-toolkits
omp plugin install general-reminder@eyay-toolkits
```

## Example

`.omp/reminders.json` in a Go project:

```json
{
  "reminders": [
    "Run gofmt before committing.",
    { "text": "Check mise.toml before installing any tool globally.", "once": true }
  ]
}
```

## Scope

- Works on pi ≥ 0.84.3 and omp (both expose `pi.getAllTools()`-era extension
  APIs; only the config path differs).
- The LSP reminder is NOT here — it lives in the
  [design-thinking](../design-thinking/) extension, where it can probe
  harness capability.