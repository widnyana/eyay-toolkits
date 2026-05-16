# Installation

You need [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and a working API key or subscription.

## From the marketplace

```bash
# Add the marketplace (one-time)
/plugin marketplace add widnyana/eyay-toolkits

# Install what you need
/plugin install bmad-sprint-run@eyay-toolkits
/plugin install career-tools@eyay-toolkits
/plugin install evm-decimal-validation@eyay-toolkits
/plugin install solana-onchain@eyay-toolkits
/plugin install sui-dev-tools@eyay-toolkits
/plugin install prose-engineers@eyay-toolkits
/plugin install ts-backend-dev@eyay-toolkits
/plugin install visual-gen@eyay-toolkits
```

Verify with `/plugin list` or `/skills`. Restart Claude Code or open a new session if nothing shows up.

Uninstall any time: `/plugin uninstall <plugin-name>`

To update: re-run the install command. Then restart Claude Code.
