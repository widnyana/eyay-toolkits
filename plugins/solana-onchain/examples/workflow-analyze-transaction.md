# Workflow: Analyze and Understand Transactions

Learn how to understand what Solana transactions do.

## Basic Transaction Analysis

**User Request:**
```
What does this transaction do?
Hash: [transaction hash]
```

**What Claude Does:**
1. Detects transaction query
2. Activates Solana Transaction Analyst agent
3. Fetches transaction details
4. Breaks down in simple, non-technical terms
5. Explains who did what and why

**Expected Response:**
```
This transaction:
- Type: Token Transfer
- From: User Address A
- To: User Address B
- Amount: 100 USDC
- Program: Token Program
- Status: ✓ Success
- Time: [Date and time]

What happened:
User A sent 100 USDC to User B. The transaction succeeded and was confirmed.
```

## Complex Transaction Analysis

**User Request:**
```
I don't understand what happened in this transaction.
Can you explain?
Hash: [DEX swap, bridge, or complex transaction]
```

**What Claude Does:**
1. Fetches full transaction details
2. Breaks down each instruction
3. Identifies the program involved (DEX, bridge, etc.)
4. Explains the chain of events
5. Shows final result in simple terms

**Expected Response:**
```
This is a DEX swap transaction:

Step 1: You approved sending 100 USDC to Raydium
Step 2: Raydium swapped your USDC for SOL
Step 3: SOL was sent to your wallet

Result: You now have approximately 0.5 SOL (original 100 USDC)
Cost: ~0.01 SOL in transaction fees

Status: ✓ Success
```

## Failed Transaction Investigation

**User Request:**
```
This transaction failed. Why?
Hash: [failed transaction]
```

**What Claude Does:**
1. Fetches transaction status
2. Analyzes failure reason
3. Suggests fixes or next steps

**Expected Response:**
```
This transaction failed because:
Reason: Insufficient funds

What happened:
You tried to transfer 1 SOL but only had 0.95 SOL.
The transaction was rejected before execution.

Solution:
- Get more SOL to your wallet, or
- Reduce the transfer amount
```

## Common Transaction Types

| Type | Example |
|------|---------|
| Simple transfer | Send SOL from one address to another |
| Token transfer | Send USDC, BONK, etc. |
| DEX swap | Exchange one token for another (Raydium, Magic Eden) |
| Bridge transfer | Move tokens between networks |
| Program interaction | Mint NFTs, stake SOL, etc. |

## Analysis Tips

**Getting Transaction Hashes:**
- From Solana Explorer: [explorer.solana.com](https://explorer.solana.com)
- From your wallet history
- From someone else sharing the hash

**What to Ask:**
```
"What does this transaction do?"           # Basic explanation
"I don't understand what happened here"    # Deeper analysis
"Why did this fail?"                       # Error diagnosis
"What program made this transaction?"      # Identify the service
```

## Example Analyses

### Example 1: Simple Transfer
```
User: What happened in this transaction?
[hash]

Claude: This is a simple transfer:
- Sender: Address A
- Receiver: Address B  
- Amount: 5 SOL
- Status: ✓ Confirmed
- Fee: 0.00005 SOL

Summary: Someone sent 5 SOL to another address.
```

### Example 2: Token Swap
```
User: Can you explain this?
[hash]

Claude: This is a DEX swap on Raydium:
- You provided: 100 USDC
- You received: ~0.48 SOL
- Price: ~208 USDC per SOL
- Fee: ~1% (market fee)
- Status: ✓ Success

You successfully swapped USDC for SOL.
```

### Example 3: Failed Transaction
```
User: Why did this fail?
[hash]

Claude: This transaction failed because:
- Error: Insufficient balance
- You tried: Transfer 10 SOL
- You had: 8 SOL
- Needed: 10.00005 SOL (including fee)

Solution: Add more SOL or reduce the amount.
```

## Common Patterns

### Investigating Your Own Transactions
```
"I just made a transfer. Can you check the status?"
[Claude checks transaction details]
```

### Learning From Others
```
"Can you explain what this address does? They made these transactions: [hashes]"
[Claude analyzes patterns across multiple transactions]
```

### Debugging Issues
```
"My transfer didn't work. Here's the failed transaction: [hash]"
[Claude explains what went wrong and how to fix it]
```

## Mainnet vs Devnet

The analysis process is the same, but:
- **Devnet**: Test transactions, no real value
- **Testnet**: Educational transactions, real conditions
- **Mainnet**: Real transactions, real value

To analyze mainnet transactions, ensure you've accepted risk:
```
/solana-accept-risk
```

## Tips

- Transaction hashes can be found in wallet apps or explorers
- You can analyze anyone's transaction (they're public)
- The analyzer explains in simple terms for non-technical users
- Keep common transaction hashes handy for learning
