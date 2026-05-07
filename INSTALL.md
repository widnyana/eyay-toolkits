# Installation

You need [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and a working API key or subscription.

## From the marketplace

```bash
# Add the marketplace (one-time)
/plugin marketplace add widnyana/eyay-toolkits

# Install what you need
/plugin install career-tools@eyay-toolkits
/plugin install evm-decimal-validation@eyay-toolkits
/plugin install solana-onchain@eyay-toolkits
/plugin install sui-dev-tools@eyay-toolkits
/plugin install technical-writer@eyay-toolkits
/plugin install ts-backend-dev@eyay-toolkits
```

Verify with `/plugin list` or `/skills`. Restart Claude Code or open a new session if nothing shows up.

Uninstall any time: `/plugin uninstall <plugin-name>`

## Manual install

If the marketplace doesn't work (it happens), clone and point directly:

```bash
git clone https://github.com/widnyana/eyay-toolkits.git
cc --plugin-dir ./plugins/<plugin-name>
```

Or copy into your local plugins folder:

```bash
cp -r plugins/<plugin-name> ~/.claude-plugins/<plugin-name>
```

To update: re-run the install command, or `git pull` if manual. Then restart Claude Code.
