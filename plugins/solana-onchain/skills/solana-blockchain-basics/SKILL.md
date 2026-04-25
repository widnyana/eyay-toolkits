---
name: Solana Blockchain Basics
description: Explain fundamental Solana blockchain concepts to help users understand accounts, transactions, SOL, tokens, and programs. Activate when discussing blockchain fundamentals, explaining what blockchain is, or helping non-technical users learn about Solana.
version: 1.0.0
---

# Solana Blockchain Basics

This skill helps explain Solana blockchain concepts in simple, non-technical language. Use when users ask questions about how Solana works, what accounts are, how transactions function, or other foundational blockchain concepts.

## Key Concepts to Explain

### Solana Network
Solana is a fast, low-cost blockchain network. Think of it like a global ledger (accounting book) that anyone can read or write to, managed by thousands of computers instead of one company.

**Key points:**
- Fast: Processes thousands of transactions per second
- Cheap: Transactions cost fractions of a penny
- Open: Anyone can use it without permission
- Secure: Uses cryptography to prevent fraud

### Accounts
Everything on Solana is an "account" - like a bank account. Each account has:
- **Address**: A unique identifier (like an account number)
- **Balance**: How much SOL or tokens it holds
- **Owner**: Who controls this account
- **Data**: Information stored in the account

**Types of accounts:**
- User wallets: Hold SOL and tokens
- Token accounts: Store specific tokens (like USDC)
- Program accounts: Store smart contract data

### SOL (The Native Token)
SOL is Solana's native currency. Like dollars on the US dollar network, SOL is used to:
- Pay transaction fees (tiny amounts)
- Pay for storing data on the blockchain
- Vote on network decisions
- Stake to earn rewards

**Units:**
- 1 SOL = 1 billion lamports (smallest unit)
- Most people just use SOL

### Tokens (SPL Tokens)
SPL tokens are like custom currencies on Solana. Examples:
- USDC: Stablecoin worth ~$1
- BONK: Community meme token
- Various others created by different projects

**How they work:**
- Each token has an owner/creator
- Each user can hold token accounts for different tokens
- Tokens can be traded, transferred, or burned

### Transactions
A transaction is a request to change something on the blockchain. Examples:
- Send 1 SOL to someone
- Swap tokens on a DEX (decentralized exchange)
- Mint an NFT
- Use a smart contract

**Parts of a transaction:**
- Instructions: What to do (send SOL, swap tokens, etc.)
- Signers: Who authorized this (must sign with private key)
- Fee: How much you pay (usually ~0.00005 SOL)

**Status:**
- Pending: Waiting to be processed
- Confirmed: Added to the blockchain
- Failed: Rejected (bad balance, wrong parameters, etc.)

### Programs (Smart Contracts)
Programs are like apps on Solana that automate operations. Examples:
- Token Program: Transfers and manages tokens
- DEX Programs: Let you swap tokens
- NFT Programs: Mint and trade NFTs

**How they work:**
- Run on Solana's computers
- Execute automatically when called
- Immutable (can't be changed once deployed)

### Networks
Solana has multiple networks for different purposes:
- **Devnet**: Testing network, free SOL, no real value
- **Testnet**: Community testnet, similar to mainnet
- **Localnet**: Personal testing network
- **Mainnet-beta**: Production network, real value, real SOL

**Best practice:** Always learn and test on devnet first before using other networks.

## Common Workflows

### Understanding a Balance
"This account has 5 SOL"
→ That account controls 5 billion lamports of SOL currency

### Understanding a Transaction
"User A sent 1 SOL to User B"
→ User A signed a transaction using their private key, which transferred SOL from their account to User B's account

### Understanding Token Holdings
"User has 100 USDC"
→ User has a token account that holds 100 USDC (each worth ~$1)

## Common Questions & Answers

**Q: Is my address like a bank account number?**
A: Yes, similar idea! Your address is public (like a bank account number you can share), but your private key is like your PIN (never share it).

**Q: Do I need SOL to hold tokens?**
A: You need a tiny bit of SOL to create a token account (~0.002 SOL), but not much to hold tokens.

**Q: What's a "confirmed" transaction?**
A: Confirmed means the transaction was processed and recorded on the blockchain. It's permanent and can't be reversed.

**Q: Can transactions fail?**
A: Yes. Common reasons: insufficient balance, wrong parameters, network issues. Failed transactions are rejected and cost nothing.

**Q: Is Solana safe?**
A: The network is secure (thousands of computers verify everything). But user mistakes are common (sending to wrong address, sharing private keys). Always double-check before sending.

## Teaching Tips

- **Start with devnet**: Always encourage users to practice on devnet (free, no real value)
- **Use analogies**: Compare to banks, money, or familiar systems
- **Simplify numbers**: 5.2 SOL is easier to think about than 5,200,000,000 lamports
- **Explain before transactions**: Explain how something works before asking to execute it
- **Address verification**: Always have users double-check addresses before sending

## When to Activate This Skill

Use this skill when users ask:
- "What is Solana?"
- "How does blockchain work?"
- "What's an account?"
- "What does SOL mean?"
- "I don't understand what just happened"
- "Can you explain this in simple terms?"
- Questions about tokens, transactions, or programs
- Requests to learn about blockchain concepts
