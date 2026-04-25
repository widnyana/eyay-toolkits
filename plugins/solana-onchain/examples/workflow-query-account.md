# Workflow: Query Account Information

Learn how to query Solana account balances and token holdings.

## Basic Balance Query

**User Request:**
```
What's the SOL balance of this account?
Address: So111111111111111111111111111111111111111111
```

**What Claude Does:**
1. Detects account query
2. Activates Solana Account Explorer agent
3. Fetches account balance and details
4. Explains results in simple terms

**Expected Response:**
```
This account has approximately X SOL (Y lamports).

Key details:
- Account type: [System/Token/Associated Token Account]
- Owner: [Program that owns this account]
- Created: [Timestamp]
```

## Token Holdings Query

**User Request:**
```
What tokens does this address hold?
Address: [user address]
```

**What Claude Does:**
1. Queries all token accounts for the address
2. Lists tokens with amounts and USD values (if available)
3. Explains token types in non-technical terms

**Expected Response:**
```
This address holds:
- X USDC (Stablecoin)
- Y SOL (Native Solana token)
- Z BONK (Meme token)

Total value: approximately $[amount]
```

## Transaction History Query

**User Request:**
```
Show me the recent transactions for this address.
Address: [user address]
```

**What Claude Does:**
1. Fetches recent transaction signatures
2. Analyzes transaction details
3. Explains transaction patterns

**Expected Response:**
```
Recent activity for this address:
1. [Date] - Received 1 SOL from [address]
2. [Date] - Sent 0.5 SOL to [address]
3. [Date] - Swapped tokens on [program name]

Total transactions: X
```

## Common Questions & How to Ask

| Question | Example |
|----------|---------|
| Check balance | "What's the balance of 9B5..." |
| List tokens | "What tokens does this address hold?" |
| Check transaction | "What does this transaction do? [hash]" |
| Find recent activity | "Show me recent transactions for [address]" |

## Tips

- You can use short address aliases: "9B5..." instead of full address
- The plugin defaults to devnet; switch networks with `/solana-network` if needed
- Mainnet queries require `/solana-accept-risk` first
- Results are real-time from the blockchain
