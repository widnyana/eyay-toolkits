# Uninstall

How to remove this repo's plugins and packages, per install method. (Installing? See [INSTALL.md](INSTALL.md).)

## Claude Code (plugins)

Remove a single plugin:

```
/plugin uninstall <plugin-name>@eyay-toolkits
```

List installed plugins to get exact names: `/plugin list`

Remove everything — the plugins *and* the marketplace registration:

```
/plugin marketplace remove eyay-toolkits
```

Then restart Claude Code (or run `/reload-plugins`) so the changes take effect.

## Other agents (skills.sh)

Remove installed skills interactively (pick what to remove from the list):

```bash
npx skills remove
```

See what's installed first with `npx skills list`.

## pi / OMP (packages)

pi:

```bash
pi uninstall npm:@widnyana/design-thinking
```

Plugins installed on pi by directory path (see [INSTALL.md](INSTALL.md)) are removed the same way, with the path as `pi list` shows it:

```bash
pi remove /path/to/eyay-toolkits/plugins/prose-engineers
```

OMP (the `uninstall` target is the same spec you installed with — check exact names with `omp plugin list`):

```bash
omp plugin uninstall npm:@widnyana/design-thinking
```

---

Installed something and it's still showing up? Restart the agent session — loaded
skills/commands/hooks from an uninstalled plugin stay active until reload.
