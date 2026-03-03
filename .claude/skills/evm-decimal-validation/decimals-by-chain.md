# Token Decimals by Chain

Reference guide for common tokens and their decimals across different EVM chains.

## Major Stablecoins

### USDC (USD Coin)

| Chain | Decimals | Notes |
|-------|----------|-------|
| Ethereum | 6 | Native deployment |
| Polygon | 6 | Bridged via PoS bridge |
| Arbitrum | 6 | Official bridge |
| Optimism | 6 | Official bridge |
| Base | 6 | Native deployment |
| BNB Chain | 18 | Different implementation |

### USDT (Tether)

| Chain | Decimals | Notes |
|-------|----------|-------|
| Ethereum | 6 | Native deployment |
| Polygon | 6 | Bridged |
| BNB Chain | 18 | Different implementation |
| Arbitrum | 6 | Bridged |

## Native Tokens

| Token | Decimals | Note |
|-------|----------|------|
| ETH | 18 | All EVM chains |
| MATIC | 18 | Polygon native |
| BNB | 18 | BNB Chain native |
| BASE | 18 | Base ETH equivalent |

## Wrapped Tokens

| Token | Decimals | Note |
|-------|----------|------|
| WBTC | 8 | Matches Bitcoin |
| WETH | 18 | Matches ETH |

## Custom Tokens

When deploying custom tokens, document decimals per chain:

```yaml
# token-config.yaml
MYTOKEN:
  ethereum:
    address: "0x..."
    decimals: 18
  polygon:
    address: "0x..."
    decimals: 0  # Different deployment
  base:
    address: "0x..."
    decimals: 2
```

## Querying On-Chain

```go
// Query decimals from any ERC20 contract
func QueryDecimals(client *ethclient.Client, tokenAddr common.Address) (uint8, error) {
    contract, err := NewERC20(tokenAddr, client)
    if err != nil {
        return 0, err
    }
    return contract.Decimals(nil)
}
```

## Conversion Reference

| Decimals | 1 Token in Wei | Example |
|----------|----------------|---------|
| 18 | 1000000000000000000 | 1 ETH |
| 6 | 1000000 | 1 USDC |
| 2 | 100 | 1 IDRX |
| 0 | 1 | Raw integer |
