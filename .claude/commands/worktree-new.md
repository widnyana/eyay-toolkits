---
description: Create a new git worktree with isolated ports for parallel development
model: sonnet
---

# Create Git Worktree

Create a worktree for: $ARGUMENTS

## Instructions

1. **Determine branch name** from arguments (e.g., `feature/123-invoice-tests`)
2. **Calculate port offset** based on existing worktree count
3. **Create worktree** at `../backendwt/<branch-name>/`
4. **Copy environment** from main repo and override ports
5. **Install dependencies** and generate Prisma client

## Process

### Step 1: Validate Arguments

```bash
BRANCH_NAME="$ARGUMENTS"
# Normalize: remove leading slashes, spaces
BRANCH_NAME=$(echo "$BRANCH_NAME" | sed 's/^[/]*//' | tr ' ' '-')

if [ -z "$BRANCH_NAME" ]; then
  echo "Error: Branch name required"
  echo "Usage: /worktree-new feature/my-feature"
  exit 1
fi
```

### Step 2: Calculate Port Offset

```bash
# Count existing worktrees (excluding beads-sync and main)
WORKTREE_COUNT=$(git worktree list | grep -v "beads-sync" | wc -l | tr -d ' ')
# Offset: 100 per worktree (main=0, WT-1=100, WT-2=200)
PORT_OFFSET=$((WORKTREE_COUNT * 100))
```

**Port allocation:**
| Worktree | API_PORT | WEBHOOK_PORT |
|----------|----------|--------------|
| Main     | 8000     | 8002         |
| WT-1     | 8100     | 8102         |
| WT-2     | 8200     | 8202         |

### Step 3: Create Worktree

```bash
MAIN_REPO="$(pwd)"
WORKTREE_DIR="../backendwt"
WORKTREE_PATH="${WORKTREE_DIR}/${BRANCH_NAME}"

# Create parent directory if needed
mkdir -p "$WORKTREE_DIR"

# Create branch if it doesn't exist
git branch "$BRANCH_NAME" 2>/dev/null || true

# Create worktree
git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
```

### Step 4: Setup Environment

```bash
cd "$WORKTREE_PATH"

# Copy .env from main repo (real config, not .env.example)
if [ -f "$MAIN_REPO/.env" ]; then
  cp "$MAIN_REPO/.env" .env
elif [ -f "$MAIN_REPO/.env.local" ]; then
  cp "$MAIN_REPO/.env.local" .env
else
  cp .env.example .env
  echo "Warning: No .env found in main repo, using .env.example"
fi

# Calculate ports
API_PORT=$((8000 + PORT_OFFSET))
WEBHOOK_PORT=$((8002 + PORT_OFFSET))
JOB_PORT=$((8003 + PORT_OFFSET))
TEST_WEBHOOK_PORT=$((8004 + PORT_OFFSET))
CONSUMER_PORT=$((8005 + PORT_OFFSET))

# Create .env.local with port overrides
cat > .env.local << EOF
# Worktree port overrides (offset: $PORT_OFFSET)
API_PORT=$API_PORT
WEBHOOK_PORT=$WEBHOOK_PORT
JOB_PORT=$JOB_PORT
TEST_WEBHOOK_PORT=$TEST_WEBHOOK_PORT
CONSUMER_PORT=$CONSUMER_PORT
EOF

echo "Created .env.local with ports: API=$API_PORT, WEBHOOK=$WEBHOOK_PORT"
```

### Step 5: Install Dependencies

```bash
cd "$WORKTREE_PATH"
pnpm install
pnpm prisma:generate
```

## Output

After completion, display:

```
Worktree created successfully!

  Path:    $WORKTREE_PATH
  Branch:  $BRANCH_NAME
  Ports:   API=$API_PORT, WEBHOOK=$WEBHOOK_PORT, JOB=$JOB_PORT

To start working:
  cd $WORKTREE_PATH
  pnpm start:dev

To remove when done:
  git worktree remove $WORKTREE_PATH
```

## Checklist

- [ ] Branch name validated
- [ ] Port offset calculated from existing worktrees
- [ ] Worktree created at ../backendwt/<branch>/
- [ ] .env copied from main repo
- [ ] .env.local created with port overrides
- [ ] Dependencies installed
- [ ] Prisma client generated
- [ ] Summary displayed with ports and paths

## Troubleshooting

**"Branch already exists"**: Branch exists but worktree doesn't - this is fine, worktree will use existing branch.

**"Worktree already exists"**: Delete first with `git worktree remove <path>`.

**Port conflict**: Check if another worktree is using the same offset. List with `git worktree list`.
