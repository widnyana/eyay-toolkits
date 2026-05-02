# evm-decimal-validation

Validate and configure token decimals for EVM-compatible blockchain deployments. Prevents amount calculation errors caused by assuming all chains use the same decimals.

## Install

```bash
/plugin install evm-decimal-validation@eyay-toolkits
```

## What It Does

The same token deployed across multiple EVM chains can have different decimal values. This skill helps you audit, validate, and fix decimal configurations in your codebase.

Covers:
- Audit hardcoded decimal values in network configs
- Query on-chain `decimals()` for each deployment
- Add per-chain decimal fields to network config
- Fix `FromWei`/`ToWei` conversions to use correct decimals
- Write tests for decimal handling

## When to Use

- Deploying ERC20 tokens across multiple chains
- Fixing incorrect token amounts in balance queries or transfers
- Setting up a new network configuration
- Building bridge or cross-chain operations

## Trigger

Ask to validate decimals, fix token amounts, or configure multi-chain deployments. Examples:

```
"Validate the decimals for our token across all chains"
"Fix the hardcoded decimal values in the network config"
"Add decimal validation for the new chain deployment"
```

## Reference

Includes a `decimals-by-chain.md` reference of common tokens and their decimals across EVM chains.
