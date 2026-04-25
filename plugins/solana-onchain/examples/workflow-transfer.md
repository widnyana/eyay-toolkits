# Workflow: Transfer SOL or Tokens

Learn how to safely execute transfers on Solana.

## Basic SOL Transfer (Devnet)

**Setup (One-Time):**
```bash
# Set your keypair location
export SOLANA_KEYPAIR_PATH=$HOME/.config/solana/id.json

# Confirm devnet is selected
/solana-network
# Should show: Current network: devnet
```

**User Request:**
```
Transfer 0.5 SOL to address So1111...
```

**What Claude Does:**
1. Checks network (devnet = safe, no extra confirmation)
2. Validates keypair is configured
3. Simulates transaction to check it will succeed
4. Shows you what will happen before executing
5. Executes the transfer
6. Confirms success with transaction hash

**Expected Response:**
```
✓ Transfer successful!
Amount: 0.5 SOL
To: So1111...
Transaction: [hash]
Status: Confirmed
```

## Mainnet Transfer (Testnet)

**Setup (One-Time):**
```bash
# Switch to testnet
/solana-network testnet

# Accept mainnet risks (required for non-devnet)
/solana-accept-risk
```

**User Request:**
```
Transfer 0.1 SOL to So1111... on testnet
```

**What Claude Does:**
1. Checks SOLANA_ACCEPT_RISK is set
2. Warns about testnet conditions
3. Simulates transaction
4. Executes transfer
5. Confirms with transaction hash

## Safe Transfer Process

Always follow this pattern:

### Step 1: Choose Network
```
/solana-network devnet
# Use devnet for learning/testing
```

### Step 2: Prepare Keypair (if needed)
```
/solana-keypair
# Set location of your keypair
```

### Step 3: Accept Risk (for non-devnet)
```
/solana-accept-risk
# Required for testnet/mainnet
```

### Step 4: Simulate First
```
User: "Can you simulate transferring 0.1 SOL to [address]?"

Claude: [Shows what will happen without executing]
```

### Step 5: Execute
```
User: "Now execute the transfer"

Claude: [Executes transfer, shows confirmation]
```

## SPL Token Transfer

**Request:**
```
Send 100 USDC to address So1111...
```

**What Claude Does:**
1. Checks for USDC token account on your address
2. Checks recipient can receive USDC (or creates account)
3. Simulates transfer
4. Executes transfer

## Common Patterns

| Goal | Request |
|------|---------|
| Test transfer | "Simulate sending 0.1 SOL to [address]" |
| Execute transfer | "Send 0.1 SOL to [address]" |
| Token transfer | "Send 100 USDC to [address]" |
| Create token account | "Create a token account for USDC" |

## Safety Checklist

Before any transfer:
- [ ] Correct network selected (`/solana-network`)
- [ ] Recipient address is correct (triple-check)
- [ ] Amount is correct
- [ ] You accepted risks if not on devnet (`/solana-accept-risk`)
- [ ] You simulated first to verify

## Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Keypair not found" | No keypair configured | Run `/solana-keypair` |
| "Mainnet blocked" | Risk not accepted | Run `/solana-accept-risk` |
| "Insufficient balance" | Not enough SOL | Check balance first |
| "Invalid address" | Bad recipient address | Copy address carefully |

## Tips

- Always test on devnet first before mainnet
- Small amounts first to verify addresses work
- Don't reuse addresses for different purposes
- Keep your keypair secure, never share
- Use dedicated wallets for blockchain testing
