# Installation

You need [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and a working API key or subscription.

## From the marketplace

```bash
# Add the marketplace (one-time)
/plugin marketplace add widnyana/eyay-toolkits

# Install what you need
/plugin install block-forbidden-git-add@eyay-toolkits
/plugin install bmad-sprint-run@eyay-toolkits
/plugin install career-tools@eyay-toolkits
/plugin install design-thinking@eyay-toolkits
/plugin install evm-decimal-validation@eyay-toolkits
/plugin install perihbahasa@eyay-toolkits
/plugin install prose-engineers@eyay-toolkits
/plugin install solana-onchain@eyay-toolkits
/plugin install sui-dev-tools@eyay-toolkits
/plugin install ts-backend-dev@eyay-toolkits
/plugin install visual-gen@eyay-toolkits
/plugin install iac-check-guard@eyay-toolkits
```

Verify with `/plugin list` or `/skills`. Restart Claude Code or open a new session if nothing shows up.

Uninstall any time — see [UNINSTALL.md](UNINSTALL.md) for all methods. Quick form:

```
/plugin uninstall <plugin-name>@eyay-toolkits
```

To update: re-run the install command. Then restart Claude Code.

## Other agents (skills.sh)

```bash
npx skills add widnyana/eyay-toolkits
```

Uninstall: `npx skills remove` (interactive). See [UNINSTALL.md](UNINSTALL.md).

## pi coding agent (plugins)

Most of these plugins are skill-only, and skills are the same format across Claude Code and [pi](https://pi.dev) — so they load in pi too. Clone the repo and install the plugin directory as a package; pi auto-discovers its `skills/` directory:

```bash
git clone https://github.com/widnyana/eyay-toolkits
pi install /path/to/eyay-toolkits/plugins/prose-engineers
```

Each skill registers as a `/skill:<name>` command (e.g. `/skill:technical-writer`). Verify with `pi list`.

Works for any plugin whose contents are just `skills/`: **bmad-sprint-run**, **career-tools**, **evm-decimal-validation**, **perihbahasa**, **prose-engineers**, **sui-dev-tools**, **ts-backend-dev**, **visual-gen**. Plugins that depend on Claude Code–specific hooks, agents, or commands (**block-forbidden-git-add**, **design-thinking**, **solana-onchain**) are Claude Code-only — though **design-thinking** has a native pi package instead (below).

Update: `git pull` then re-run the `pi install` command. Uninstall: see [UNINSTALL.md](UNINSTALL.md).

## OMP marketplace

The same repository is an [omp](https://omp.sh) plugin marketplace. The pi packages under `pi-packages/` install as omp plugins (extensions, prompts, and skills):

```bash
omp plugin marketplace add widnyana/eyay-toolkits
omp plugin install design-thinking@eyay-toolkits
omp plugin install block-forbidden-git-add@eyay-toolkits
omp plugin install iac-check-guard@eyay-toolkits
```

Update: `omp plugin marketplace update eyay-toolkits` then `omp plugin upgrade design-thinking@eyay-toolkits`. Uninstall: `omp plugin uninstall <name>@eyay-toolkits`.

## pi packages

This repo also ships packages for [pi](https://pi.dev) under `pi-packages/` — these are the same packages the OMP marketplace serves above:

```bash
pi install npm:@widnyana/design-thinking
# or via OMP
omp install npm:@widnyana/design-thinking
```
```bash
pi install /path/to/eyay-toolkits/pi-packages/iac-check-guard
# or via OMP
omp install /path/to/eyay-toolkits/pi-packages/iac-check-guard
```
```bash
pi install /path/to/eyay-toolkits/pi-packages/block-forbidden-git-add
# or via OMP
omp install /path/to/eyay-toolkits/pi-packages/block-forbidden-git-add
```
```bash
pi install /path/to/eyay-toolkits/pi-packages/agent-notify
# or via OMP
omp install /path/to/eyay-toolkits/pi-packages/agent-notify
```

See [pi-packages/design-thinking/README.md](pi-packages/design-thinking/README.md) and [pi-packages/agent-notify/README.md](pi-packages/agent-notify/README.md) for usage.

