---
name: Solana Development Workflows
description: Guide common Solana development patterns and workflows including querying data, simulating transactions, executing transfers, and analyzing programs. Activate during development conversations involving transaction workflows, data queries, or blockchain interaction patterns.
version: 1.0.0
---

# Solana Development Workflows

This skill provides guidance on common patterns and workflows for interacting with Solana, helping users accomplish tasks efficiently and safely.

## Core Workflows

### Workflow 1: Query & Analyze

**Purpose:** Understand blockchain state without making changes.

**Steps:**
1. User asks about an account, balance, or transaction
2. Claude identifies the query type
3. Claude uses Account Explorer or Transaction Analyst agent
4. Results are explained in simple terms

**Examples:**
```
"What's the balance of So1111...?"
"Show me recent transactions for this address"
"What does this transaction do?"
"Who owns this account?"
```

**Cost:** Free (read-only operations)
**Risk:** None (no state changes)
**Network:** Works on any network (devnet, testnet, mainnet)

### Workflow 2: Simulate & Verify

**Purpose:** Test a transaction without spending real money.

**Steps:**
1. User requests a simulation: "Simulate sending 0.5 SOL to [address]"
2. Claude prepares the transaction
3. Claude sends it to Solana network in simulation mode
4. Network predicts the result without executing
5. Claude shows you what would happen

**Examples:**
```
"Can you simulate this transfer before I execute?"
"What would happen if I swapped 100 USDC?"
"Will this token account creation work?"
"Check if this transaction would succeed"
```

**Cost:** Free (no real funds spend)
**Risk:** None (not executed)
**Network:** Best on testnet/mainnet to match real conditions
**Pro tip:** Always simulate before executing on mainnet

### Workflow 3: Execute & Confirm

**Purpose:** Actually perform a blockchain operation.

**Steps:**
1. User requests execution: "Send 0.1 SOL to [address]"
2. Claude reminds of network (devnet = automatic, mainnet = requires acceptance)
3. Claude simulates first to verify success
4. Claude explains what will happen
5. Claude executes the transaction
6. Claude shows transaction hash and confirmation

**Examples:**
```
"Transfer 1 SOL to [address]"
"Send 100 USDC to [recipient]"
"Execute the swap"
"Create this token account"
```

**Cost:** Real SOL/tokens (amounts vary)
**Risk:** Medium to high (depends on amount)
**Network:** Devnet (safe) or Mainnet (after `/solana-accept-risk`)
**Safety:** Requires simulation first, clear confirmations

### Workflow 4: Troubleshoot & Fix

**Purpose:** Diagnose problems and find solutions.

**Steps:**
1. User reports issue: "This transaction failed"
2. Claude analyzes the error
3. Claude explains root cause in simple terms
4. Claude suggests solutions
5. User implements fix and retries

**Examples:**
```
"Why did this fail?"
"Insufficient balance means?"
"How do I fix 'missing signer'?"
"What does this error mean?"
```

**Cost:** Varies (depending on fix)
**Risk:** None initially (diagnosis only)
**Network:** Any
**Value:** Saves debugging time

## Operational Patterns

### Pattern 1: Data Discovery

**When:** "I need to understand this account"

**Steps:**
1. Get account address
2. Query account details
3. Check balance
4. List token holdings
5. Show recent transactions
6. Explain the account's purpose

**Tools:** Account Explorer agent
**Cost:** Free
**Time:** Seconds

### Pattern 2: Transaction Inspection

**When:** "I need to understand what happened"

**Steps:**
1. Get transaction hash
2. Fetch transaction details
3. Break down instructions
4. Identify programs involved
5. Explain outcome
6. Highlight relevant details

**Tools:** Transaction Analyst agent
**Cost:** Free
**Time:** Seconds

### Pattern 3: Safe Transfer

**When:** "I need to send SOL/tokens"

**Steps:**
1. Verify network (devnet, testnet, mainnet)
2. Check balance is sufficient
3. Verify recipient address
4. Simulate the transaction
5. Review simulation results
6. Execute transaction
7. Confirm with transaction hash

**Tools:** solana-onchain-mcp transfer tools
**Cost:** Transaction fee (~0.00005 SOL)
**Time:** Minutes

### Pattern 4: Token Account Setup

**When:** "I need to prepare for token operations"

**Steps:**
1. Identify token type (USDC, BONK, etc.)
2. Check if token account exists
3. If not, create token account
4. Verify creation was successful
5. Account is ready for transfers

**Tools:** solana-onchain-mcp account creation
**Cost:** ~0.002 SOL per account
**Time:** Minutes

### Pattern 5: Multi-Step Operations

**When:** "I need to do multiple operations"

**Steps:**
1. Break down into sub-tasks
2. Execute each task safely
3. Verify each step
4. Proceed to next step
5. Document complete flow

**Example:** "Swap USDC for SOL, then transfer SOL to friend"
1. Swap tokens
2. Verify swap completed
3. Transfer SOL
4. Confirm transfer
5. Summarize operation

## Decision Trees

### "Should I use devnet or mainnet?"

```
Are you learning or testing new code?
├─ Yes → Use devnet (free, no risk)
└─ No → Have you tested on devnet first?
    ├─ No → Go test on devnet first
    └─ Yes → Use testnet to test with real conditions
        └─ Works on testnet? → Ready for mainnet with `/solana-accept-risk`
```

### "How much should I send first?"

```
Is it your first time with this address?
├─ Yes → Send 0.01-0.1 SOL (minimal test amount)
│   └─ Verify it works → Send larger amount
└─ No → Already tested this address?
    ├─ Yes → Send normal amount
    └─ No → Send small test amount first
```

### "Should I simulate first?"

```
Is this a transaction that modifies blockchain state?
├─ No (just querying) → No simulation needed
└─ Yes (transfer, swap, etc.)
    ├─ First time? → ALWAYS simulate first
    └─ Done it before? → Still simulate if unsure
```

## Common Task Patterns

### Task: Check if Address is Valid
```
1. Query the address with Account Explorer
2. If it returns data → Valid
3. If it fails → Invalid or doesn't exist
```

### Task: Verify Funds Arrived
```
1. Get recipient address
2. Check current balance
3. Check balance matches expectation
4. Confirmed! (or investigate if wrong amount)
```

### Task: Find Transaction Details
```
1. Get transaction hash from wallet or explorer
2. Query with Transaction Analyst
3. Explain what happened
4. Identify status (success/failed/pending)
```

### Task: Investigate Failed Transfer
```
1. Get failed transaction hash
2. Analyze with Transaction Analyst
3. Identify failure reason
4. Explain what went wrong
5. Suggest fix
```

### Task: Prepare for Mainnet
```
1. Test on devnet thoroughly
2. Test on testnet (real conditions)
3. Run `/solana-accept-risk`
4. Run `/solana-network mainnet-beta`
5. Execute with confidence
```

## Parameter Patterns

### Address Formats
- Full: `So1111111111111111111111111111111111111111111111` (44 chars)
- Short: `9B5...` (first 3, last 3 chars)
- Both work; full is safer to avoid typos

### Amount Formats
- SOL: `0.5` (decimal format)
- Token: `100` or `100.5` (depends on decimals)
- Lamports: `500000000` (if working with raw numbers)

### Network Names
- `devnet`: Testing network
- `testnet`: Community testnet
- `localnet`: Local validator
- `mainnet-beta`: Production

## Error Recovery

### "Insufficient Balance"
- Check current balance
- Reduce transfer amount or
- Add more SOL to wallet

### "Invalid Address"
- Verify address format (44 characters)
- Check for typos
- Copy from reliable source

### "Network Error"
- Check internet connection
- Retry the operation
- Switch networks if needed

### "Transaction Failed"
- Analyze with Transaction Analyst
- Identify root cause
- Fix issue and retry

## Best Practices by Role

### For Non-Technical Users
1. Start on devnet always
2. Ask Claude to explain before executing
3. Use simulation before real transactions
4. Keep amounts small until comfortable
5. Double-check addresses every time

### For Technical Users
1. Understand network differences
2. Use appropriate RPC endpoints
3. Handle errors programmatically
4. Optimize for speed/cost
5. Automate common patterns

### For Developers
1. Test contracts on devnet first
2. Use test wallets throughout
3. Understand program architecture
4. Verify contract behavior
5. Document your flows

## Workflow Templates

### Template 1: Safe First-Time Transfer
```
1. `/solana-network devnet` → Switch to devnet
2. `Query balance` → Verify funds
3. `Simulate: send 0.01 SOL to [address]`
4. Review simulation results
5. `Execute transfer`
6. Verify transaction succeeded
```

### Template 2: Mainnet Preparation
```
1. Test thoroughly on devnet
2. Test on testnet
3. `/solana-accept-risk` → Accept risk
4. `/solana-network mainnet-beta` → Switch to mainnet
5. Simulate transaction
6. Execute small amount
7. Verify success
8. Increase amount if confident
```

### Template 3: Transaction Investigation
```
1. Get transaction hash
2. Analyze with Transaction Analyst
3. Understand what happened
4. Identify status
5. Extract relevant details
6. Learn from the transaction
```

## Pro Tips

- **Verify twice, execute once**: Check addresses and amounts carefully
- **Start small**: 0.01 SOL is plenty to test
- **Simulate always**: Costs nothing, prevents mistakes
- **Read output carefully**: Claude explains important details
- **Keep notes**: Document successful addresses and patterns
- **Use devnet liberally**: It's free for testing
- **Ask questions**: Don't guess about blockchain operations
