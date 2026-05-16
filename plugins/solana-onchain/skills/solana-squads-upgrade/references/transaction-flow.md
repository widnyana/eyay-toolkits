# Transaction Flow Details

## Squads Vault Transaction Lifecycle

### 1. Vault PDA Derivation

```typescript
import * as multisig from '@sqds/multisig'

const [vaultPda] = multisig.getVaultPda({
  multisigPda,
  index: vaultIndex  // default: 0
})
```

The vault PDA serves as both the upgrade authority and the fee payer for the transaction.

### 2. Transaction Index Management

```typescript
const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
  connection,
  multisigPda
)
const currentTransactionIndex = Number(multisigInfo.transactionIndex)
const newTransactionIndex = BigInt(currentTransactionIndex + 1)
```

Each vault transaction gets an incrementing index. The action reads the current index and increments by 1.

### 3. Vault Transaction Creation

```typescript
const createVaultTxIx = await multisig.instructions.vaultTransactionCreate({
  multisigPda,
  transactionIndex: newTransactionIndex,
  creator: keypairObj.publicKey,
  vaultIndex,
  ephemeralSigners: 0,
  transactionMessage: message,  // TransactionMessage with all instructions
  memo  // Descriptive memo like "Program upgrade with Anchor IDL update"
})
```

The `ephemeralSigners: 0` means no additional temporary signers are needed. The vault PDA signs via Squads' internal CPI when the proposal is executed.

### 4. Proposal Creation

After the vault transaction is created, it appears in Squads UI. Team members with sufficient permissions must approve before execution.

## Instruction Construction Details

### BPF Loader Upgrade Instruction

```
Program: BPFLoaderUpgradeab1e11111111111111111111111
Discriminator: [3, 0, 0, 0]

Accounts:
  0. [writable] ProgramData account (PDA of [programId] from BPF loader)
  1. [writable] Program ID account
  2. [writable] Buffer account (new bytecode)
  3. [writable] Spill address (vault PDA — receives leftover lamports)
  4. []         Rent sysvar
  5. []         Clock sysvar
  6. [signer]   Upgrade authority (vault PDA)
```

### Anchor IDL Upgrade Instruction

```
Program: <target program ID>
Discriminator: [0x40, 0xf4, 0xbc, 0x78, 0xa7, 0xe9, 0x69, 0x0a, 0x03]

Accounts:
  0. [writable] IDL buffer account
  1. [writable] IDL account (derived via anchor's idlAddress())
  2. [writable, signer] Upgrade authority (vault PDA)
```

The IDL address is derived using `@coral-xyz/anchor`'s `idlAddress(programId)` which computes `PublicKey.findProgramAddress([Buffer.from("anchor:idl"), programId.toBuffer()], IDL_PROGRAM_ID)`.

### Program-Metadata Account Operations

The metadata PDA is derived as:
```typescript
const [metadataPda] = await findCanonicalPda({
  program: programAddr,
  seed: 'idl'
})
```

#### Account Exists (Update Flow)

1. **Transfer** — Move extra SOL for account growth if new data is larger
2. **Extend** — Realloc in 10KB (`REALLOC_LIMIT = 10240`) chunks if size increase exceeds the limit
3. **SetData** — Write compressed data from buffer:
   ```
   encoding: Utf8, compression: Zlib, format: Json, dataSource: Direct
   ```

#### Account Does Not Exist (Create Flow)

1. **Transfer** — Fund metadata PDA with rent-exempt minimum
2. **Allocate** — Create the account as a program-metadata buffer with seed `'idl'`
3. **Extend** — Grow in 10KB chunks if data exceeds realloc limit
4. **Write** — Copy data from source buffer to PDA buffer
5. **Initialize** — Convert the buffer into a proper metadata account with encoding/compression/format metadata

### PDA Verification Transaction

Parsed from a base64-encoded transaction:
```typescript
const buffer = Buffer.from(base64String, 'base64')
const tx = Transaction.from(buffer)
// Uses tx.instructions[1] as the verification instruction (prepended to other instructions)
```

The verification instruction is prepended before all other instructions in the vault transaction.

## Compute Budget Details

### Simulation

```typescript
// Set 1.4M compute limit for simulation to capture true usage
ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })
```

Simulation uses `replaceRecentBlockhash: true` and `sigVerify: false` to avoid needing a valid blockhash or signatures.

### Buffer Application

Default buffer is `{ multiplier: 1.1 }` (10% headroom).

Priority fee is set via `ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee })`.

Compute budget instructions are position-independent — the Solana runtime processes them regardless of their position in the transaction. The final order via `tx.add()` is: price instruction, original instructions, then compute unit limit instruction.

## Retry Configuration

```
MAX_RETRIES = 15
RETRY_INTERVAL_MS = 2000 (initial)
RETRY_INTERVAL_INCREASE = 200 (per retry)
```

Each retry cycle:
1. Send raw transaction (with `maxRetries: 0` to prevent RPC-level retry)
2. Poll `getSignatureStatus` every 500ms for `delayBetweenRetries` ms
3. If confirmed/finalized, return signature
4. Otherwise, increment delay and retry

Total maximum wait: approximately 15 * 2.5s = ~37.5 seconds per attempt, ~9.5 minutes total across all retries.

## kitIxToWeb3 Adapter

The `@solana-program/program-metadata` SDK returns instructions in `@solana/kit` format. The action converts these to `@solana/web3.js` format:

```typescript
function kitIxToWeb3(ix: {
  programAddress: string
  accounts: readonly unknown[]
  data: ArrayLike<number>
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programAddress),
    keys: (ix.accounts as { address: string; role: number }[]).map((acc) => ({
      pubkey: new PublicKey(acc.address),
      isSigner: (acc.role & 2) !== 0,
      isWritable: (acc.role & 1) !== 0
    })),
    data: Buffer.from(ix.data as unknown as Uint8Array)
  })
}
```

The role bitmask: bit 0 = writable, bit 1 = signer.
