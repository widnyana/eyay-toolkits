---
name: Solana Security & Mainnet
description: Guide users on security best practices, mainnet considerations, and risk management for blockchain operations. Activate when discussing mainnet operations, security concerns, or risk acceptance.
version: 1.0.0
---

# Solana Security & Mainnet

This skill provides security guidance and helps users understand the risks and safeguards when working with blockchain networks, especially mainnet operations involving real value.

## Core Security Principles

### Rule 1: Test on Devnet First
Always test on devnet before mainnet. Devnet has:
- Free test SOL (no real value)
- Identical behavior to mainnet
- Zero financial risk
- Perfect for learning and testing

**Practice:** Test every workflow on devnet before attempting mainnet.

### Rule 2: Start With Small Amounts
When moving to testnet or mainnet:
- Send tiny test amounts first (0.01 SOL, not 1 SOL)
- Verify the address works and receives funds
- Only increase amounts after successful tests
- Never send your entire wallet at once

**Why:** Addresses can be wrong, contracts can have bugs, mistakes happen. Small amounts limit damage.

### Rule 3: Verify Addresses Multiple Times
Before sending anything:
- Copy the address carefully
- Check it's pasted correctly (no extra characters)
- Verify the first 4 and last 4 characters match
- Test with small amount first
- Only use addresses you trust

**Common mistake:** Typo in address = funds lost forever (blockchain transactions can't be reversed).

### Rule 4: Never Share Private Keys
Your private key is like your password and PIN combined:
- Never paste it anywhere
- Never share with anyone, even support
- Never type it in browsers
- Keep it in a secure file or hardware wallet
- If compromised, move funds to a new wallet immediately

**If someone has your private key, they control your funds.**

### Rule 5: Use Dedicated Wallets
Create separate wallets for different purposes:
- **Testing wallet**: For devnet/testnet experiments (can lose it)
- **Staging wallet**: For small mainnet tests
- **Main wallet**: For real funds (store offline if possible)

**Why:** Limits damage if a wallet is compromised or lost.

### Rule 6: Understand Fee Costs
Know what you're paying:
- Transaction fees: ~0.00005 SOL (~$0.0001)
- Token account creation: ~0.002 SOL (~$0.002)
- Program interaction: Varies, usually <0.01 SOL
- Total cost is usually tiny, but not free

**Before mainnet:** Ensure you have enough SOL for fees plus the actual transfer.

## Network Comparison

| Aspect | Devnet | Testnet | Mainnet |
|--------|--------|---------|---------|
| Real value | No | No | YES |
| Get SOL | Free airdrop | Faucet | Purchase/earn |
| Behavior | Matches mainnet | Nearly mainnet | Production |
| Reset | Occasional | Rare | Never |
| Best for | Learning | Testing | Real operations |
| Risk | Zero | Very low | HIGH |

**Recommendation for non-technical users:**
1. Devnet: Learn and experiment
2. Testnet: Real behavior, no risk
3. Mainnet: Only after full understanding

## Mainnet Safeguards

### Why We Require `/solana-accept-risk`
This plugin requires explicit risk acceptance before mainnet operations because:

1. **Blockchain is permanent**: Transactions can't be reversed or recalled
2. **User error is common**: Wrong address, lost private key, etc.
3. **No customer service**: No bank to call and reverse a mistake
4. **Real money at stake**: Mainnet uses real SOL worth real money

### What You're Accepting
By running `/solana-accept-risk`, you confirm:
- ✓ You understand transactions are permanent
- ✓ You've tested on devnet first
- ✓ You're using a dedicated testing wallet
- ✓ You accept responsibility for mistakes
- ✓ You won't blame the plugin if you lose funds due to user error

## Risk Levels

### Low Risk (Safe on Devnet, OK on Testnet)
- Querying balances
- Viewing transactions
- Analyzing accounts
- Simulating transfers (without executing)

**No real loss possible, good for learning**

### Medium Risk (Test thoroughly before mainnet)
- Sending small test amounts
- Creating token accounts
- Swapping small amounts
- Staking or delegating

**Real loss possible but limited by amount. Test with tiny amounts first.**

### High Risk (Mainnet expert operations)
- Sending large amounts
- Using new contracts
- Automated operations
- Bridging between networks

**Large loss possible. Expert knowledge required.**

## Pre-Mainnet Checklist

Before running any mainnet operation, verify:
- [ ] You've tested on devnet at least once
- [ ] You ran `/solana-accept-risk` and accepted the terms
- [ ] Your network shows mainnet-beta (check `/solana-network`)
- [ ] Your wallet has SOL for fees plus the transfer amount
- [ ] The recipient address is correct (triple-check)
- [ ] You're using a dedicated wallet (not your main funds)
- [ ] You've simulated the transaction first
- [ ] You understand what the transaction does

**If any box is unchecked, don't proceed.**

## Common Mistakes & How to Avoid

| Mistake | How to Avoid |
|---------|------------|
| Sending to wrong address | Copy/paste carefully, verify first 4 & last 4 chars, test with small amount |
| Insufficient balance | Check balance with `/solana-network` before sending |
| Lost private key | Use hardware wallet, write down seed phrase, store securely |
| Mainnet without testing | Always test on devnet first, multiple times |
| Huge transfer amount | Start small, verify it works, then increase |
| Using new contracts | Stick to established programs, avoid brand new ones |
| Not reading prompts | Read every message Claude sends, confirm details |

## Security Tools & Best Practices

### Simulation Before Execution
Always ask Claude to "simulate this transaction first" before executing:
- Shows you what will happen
- Confirms it will succeed or explains failure
- Costs nothing (no real funds involved)

**Pattern:**
```
1. User: "Simulate transferring 0.1 SOL to [address]"
2. Claude: [Shows what will happen]
3. User: "Looks good, execute the transfer"
4. Claude: [Executes and confirms]
```

### Hardware Wallets
For serious mainnet use, consider a hardware wallet:
- Keeps private key offline
- Signs transactions securely
- Can't be hacked remotely
- Examples: Ledger, Trezor, Solflare (cold storage)

### Multi-Sig Wallets
For large amounts, use multi-signature wallets:
- Requires 2+ signatures to execute
- Protects against single point of failure
- Examples: Squads, Gnosis Safe

### Regular Backups
- Write down your seed phrase
- Store securely (encrypted, offline)
- Keep multiple copies in different locations
- Never store digitally unencrypted

## When to Ask for Help

Reach out to support if you:
- Don't understand what something does
- See an error you don't recognize
- Suspect something is wrong
- Are about to make a large transaction (ask Claude to review)
- Lost access to your wallet
- Think your key is compromised

## Red Flags & Scams

Watch out for:
- Anyone asking for your private key (never, ever share)
- "Too good to be true" opportunities (yield farms, etc.)
- Fake websites (check URL carefully)
- Unknown token airdrops (could be scams)
- Pressure to act fast (legitimate operations never rush)
- Requests to move funds urgently

**If something feels wrong, it probably is.**

## Recovery After Mistakes

### Wrong Address (Can't Recover)
If you sent to the wrong address:
- The blockchain is permanent
- Funds are gone unless the receiving address owner sends back
- Contact the recipient if known
- This is one of the most common blockchain mistakes

### Lost Private Key (Can Lose Access)
If you lost your private key:
- You can't access that wallet anymore
- Create a new wallet
- Move funds from a backup wallet if you have one
- This is why backups matter

### Compromised Key (Immediate Action)
If you think your key was stolen:
- Move funds to a new wallet immediately
- Stop using the compromised wallet
- Don't share details about what was compromised
- Learn from the incident

## When to Use Mainnet vs Testnet

**Use Devnet When:**
- Learning blockchain concepts
- Testing new workflows
- Experimenting with contracts
- Teaching someone else
- Have zero experience

**Use Testnet When:**
- Want real network behavior
- Testing before mainnet
- Have some experience
- Minimal risk acceptable

**Use Mainnet When:**
- Fully understand the operation
- Have tested extensively on devnet/testnet
- Accepted risk with `/solana-accept-risk`
- Using small amounts initially
- Have secure key management

## Key Takeaway

Blockchain is powerful but permanent. Mistakes can't be fixed. The responsibility is 100% on you:
- Solana is secure (the network is safe)
- But user error is common (addresses, keys, etc.)
- Always test on devnet first
- Start small on mainnet
- Read everything Claude writes before confirming
- Never rush decisions

**Your funds = Your responsibility. Take it seriously.**
