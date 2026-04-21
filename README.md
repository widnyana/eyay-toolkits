# eyay-toolkits

Personal Claude Code plugins. Built for shipping systems, not essays. If it helps you, steal it.

## Installation

Add this marketplace to Claude Code:

```bash
/plugin marketplace add widnyana/eyay-toolkits
```

Then install plugins:

```bash
/plugin install technical-writer@eyay-toolkits
```

## Available Skills

### 🖊️ [technical-writer](./plugins/technical-writer)

Write technical documentation, articles, reviews, and postmortems in a storytelling style that's direct, humble, and problem-first.

**Use for:**
- Technical blog articles and tutorials
- Product or architecture reviews/comparisons
- Postmortems and retrospectives
- API documentation
- How-to guides
- Code reviews and decision documents

**Core principles:**
- Problem-first framing — Lead with why readers should care
- Real examples — Use actual experiences, not invented scenarios
- Narrative structure — Tell a story while staying scannable
- Humble tone — Be direct but acknowledge limitations
- Concrete specifics — Use real numbers, actual code, specific data
- No ALL CAPS headers — Ever

**Status:** Tested and production-ready

### [evm-decimal-validation](./plugins/evm-decimal-validation)

Validate and configure token decimals for EVM-compatible blockchain deployments. Prevents amount calculation errors when the same token uses different decimals across chains.

**Use for:**
- ERC20 token deployments across multiple chains
- Token amount conversions (FromWei/ToWei)
- Auditing hardcoded decimal assumptions
- Validating on-chain decimals against configuration
- Cross-chain bridge decimal handling

**Status:** Tested and production-ready

---
