---
name: evm-decimal-validation
description: Validate and configure token decimals for EVM-compatible blockchain deployments. Use when working with ERC20 tokens, multi-chain deployments, token amount conversions, or when decimals might vary across chains.
---

# EVM Token Decimal Validation

Ensure token decimals are correctly configured for each blockchain deployment to prevent amount calculation errors.

## Quick Start

1. **Check current configuration** - Review network configs for decimal fields
2. **Validate against contracts** - Query on-chain decimals() for each deployment
3. **Update configuration** - Add per-chain decimals to network config
4. **Test conversions** - Verify FromWei/ToWei work correctly

## Token Decimal Standards

### Common Decimal Values

| Decimals | Use Case | Examples |
|----------|----------|----------|
| 18 | Standard ERC20 (most tokens) | WETH, DAI, USDC (on some chains) |
| 6 | Stablecoins | USDC, USDT (on Ethereum) |
| 8 | Bitcoin-wrapped | WBTC |
| 2 | Fiat-backed (cents) | IDRX, some CBDCs |
| 0 | Raw integers | Some wrapped tokens |

### Chain-Specific Variations

The same token contract deployed on different chains may use different decimals:

```
Token A on Ethereum:    18 decimals
Token A on Polygon:     0 decimals (different deployment)
Token A on BNB Chain:   0 decimals (different deployment)
```

## Validation Checklist

### Step 1: Audit Current Configuration

```bash
# Find hardcoded decimals
grep -rn "18)" --include="*.go" | grep -i "decimal\|wei\|amount"

# Check for decimals field in network config
grep -rn "Decimals" blockchain/networks.go
```

### Step 2: Query On-Chain Values

```go
// Get decimals from contract
decimals, err := contract.Decimals(nil)
if err != nil {
    return fmt.Errorf("failed to get decimals: %w", err)
}
```

### Step 3: Update Network Config

```go
type NetworkConfig struct {
    // ... existing fields ...
    Decimals uint8 // Token decimals for this deployment
}

// In SupportedNetworks
BaseMainnet: {
    // ...
    Decimals: 2, // From on-chain query
},
```

### Step 4: Add Helper Function

```go
// GetDecimals returns token decimals for a chain ID.
// Always provide a sensible fallback.
func GetDecimals(chainID uint64) uint8 {
    config, _, exists := GetNetworkConfigByChainID(chainID)
    if !exists {
        return 2 // Fallback to majority value
    }
    return config.Decimals
}
```

### Step 5: Replace Hardcoded Values

```go
// Before
return FromWei(balance, 18), nil

// After
return FromWei(balance, int32(GetDecimals(chainID))), nil
```

## Common Pitfalls

### Pitfall 1: Assuming All Chains Use Same Decimals

```go
// WRONG: Hardcoded decimals
amount := FromWei(balance, 18)

// CORRECT: Per-chain decimals
amount := FromWei(balance, int32(GetDecimals(chainID)))
```

### Pitfall 2: Missing Fallback Value

```go
// WRONG: No fallback, potential nil pointer
return config.Decimals, nil

// CORRECT: Sensible fallback
if !exists {
    return 2 // Majority value or most common
}
return config.Decimals
```

### Pitfall 3: Not Validating Config Against Chain

```go
// Add startup validation
func ValidateDecimals() error {
    for name, config := range SupportedNetworks {
        onChainDecimals, err := queryOnChain(config)
        if err != nil {
            continue // Skip unreachable chains
        }
        if config.Decimals != onChainDecimals {
            return fmt.Errorf("%s: config=%d, on-chain=%d",
                name, config.Decimals, onChainDecimals)
        }
    }
    return nil
}
```

## Test Patterns

```go
func TestGetDecimals(t *testing.T) {
    testCases := map[uint64]uint8{
        8453: 2,  // Base
        137:  0,  // Polygon
        56:   0,  // BSC
    }

    for chainID, expected := range testCases {
        got := GetDecimals(chainID)
        if got != expected {
            t.Errorf("Chain %d: expected %d, got %d", chainID, expected, got)
        }
    }
}

func TestGetDecimalsFallback(t *testing.T) {
    got := GetDecimals(999999) // Unknown chain
    if got != 2 {
        t.Errorf("Unknown chain should return fallback, got %d", got)
    }
}
```

## Integration Points

When adding decimal validation, check these areas:

| Area | What to Check |
|------|---------------|
| Balance queries | `BalanceOf()` uses per-chain decimals |
| Total supply | `TotalSupply()` uses per-chain decimals |
| Transfers | `ParseTokenAmount()` receives correct decimals |
| Bridge operations | Both source and dest chains considered |
| Fee calculations | Platform fees use correct decimals |
| API responses | Human-readable amounts properly converted |

## Sources

- ERC20 Token Standard: https://eips.ethereum.org/EIPS/eip-20
- OpenZeppelin ERC20: https://docs.openzeppelin.com/contracts/4.x/erc20
