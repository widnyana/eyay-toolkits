# Walrus Sites: CI/CD Deployment

Automate Walrus Site deployment from CI/CD pipelines. Covers credential preparation, GitHub Actions (official action), and other platforms (GitLab CI, CircleCI, Bitbucket Pipelines).

---

## Preparing Deployment Credentials

The CI/CD runner needs a Sui wallet with SUI (gas) and WAL (storage) tokens.

### Environment Variables

Set these as **repository secrets** (never commit them):

| Variable | Description |
|---|---|
| `SUI_KEYSTORE` | Base64-encoded contents of the Sui keystore file |
| `SUI_ADDRESS` | The address used for deployment (optional, derived from keystore) |

### Creating the Keystore

On a local machine with `sui` CLI installed:

```bash
# Create a new address for CI/CD (if not using an existing one)
sui client new-address ed25519

# Find the keystore path
sui client active-address

# The keystore file is typically at:
# ~/.sui/sui_config/sui.keystore

# Encode it for CI/CD use
base64 -w 0 ~/.sui/sui_config/sui.keystore
```

Copy the base64 output as the `SUI_KEYSTORE` secret.

### Funding the Wallet

The CI/CD wallet needs:
- **SUI** for gas (transaction fees). Estimate ~0.5 SUI per deploy by default; increase for large sites.
- **WAL** for storage. Purchase WAL tokens and stake them, or use the walrus CLI to manage storage.

### Restoring Keystore in CI

In the pipeline, decode and place the keystore:

```bash
echo "$SUI_KEYSTORE" | base64 -d > ~/.sui/sui_config/sui.keystore
```

The exact path depends on the runner's OS. On Linux CI runners:

```bash
mkdir -p ~/.sui/sui_config
echo "$SUI_KEYSTORE" | base64 -d > ~/.sui/sui_config/sui.keystore
```

---

## GitHub Actions (Official Action)

Walrus provides an official GitHub Action for site deployment.

### Basic Workflow

```yaml
name: Deploy Walrus Site

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Sui Keystore
        run: |
          mkdir -p ~/.sui/sui_config
          echo "${{ secrets.SUI_KEYSTORE }}" | base64 -d > ~/.sui/sui_config/sui.keystore

      - name: Deploy to Walrus Sites
        uses: MystenLabs/walrus-sites-github-actions/deploy@v1
        with:
          folder: ./site
          epochs: 5
```

### Action Inputs

| Input | Required | Description |
|---|---|---|
| `folder` | Yes | Path to the site directory to deploy |
| `epochs` | No | Number of epochs for blob storage (default: 1) |
| `object_id` | No | Existing site object ID for updates. If omitted, creates a new site. |
| `config` | No | Path to `sites-config.yaml` (optional) |
| `gas_budget` | No | Gas budget in MIST (default: 500000000 = 0.5 SUI) |
| `site_name` | No | Display name for the site |
| `ws_resources` | No | Path to `ws-resources.json` (optional) |

### Full Example with Updates

```yaml
name: Deploy Walrus Site

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Sui Keystore
        run: |
          mkdir -p ~/.sui/sui_config
          echo "${{ secrets.SUI_KEYSTORE }}" | base64 -d > ~/.sui/sui_config/sui.keystore

      - name: Deploy to Walrus Sites
        uses: MystenLabs/walrus-sites-github-actions/deploy@v1
        with:
          folder: ./dist
          epochs: 5
          gas_budget: 1000000000
```

After the first deploy, `ws-resources.json` in the site folder will contain the `object_id`. Commit this file so subsequent runs update the existing site instead of creating a new one.

---

## Other CI/CD Platforms

For platforms without an official action, use the `site-builder` CLI directly.

### Prerequisites

Install `site-builder` in the pipeline:

```bash
# Download latest binary
SYSTEM=$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x86_64/' | sed 's/aarch64/aarch64/')
curl -sSfL "https://storage.googleapis.com/mysten-walrus-binaries/site-builder-mainnet-latest-${SYSTEM}" -o /usr/local/bin/site-builder
chmod +x /usr/local/bin/site-builder

# Download config
mkdir -p ~/.config/walrus
curl -sSfL "https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml" \
  -o ~/.config/walrus/sites-config.yaml
```

### Generic Deploy Script

```bash
#!/bin/bash
set -euo pipefail

# Restore keystore
mkdir -p ~/.sui/sui_config
echo "${SUI_KEYSTORE}" | base64 -d > ~/.sui/sui_config/sui.keystore

# Deploy
site-builder deploy --epochs "${EPOCHS:-5}" "${SITE_DIR:-./site}"
```

### GitLab CI

```yaml
stages:
  - deploy

deploy-walrus-site:
  stage: deploy
  image: ubuntu:22.04
  only:
    - main
  before_script:
    - apt-get update && apt-get install -y curl
    - SYSTEM="linux-x86_64"
    - curl -sSfL "https://storage.googleapis.com/mysten-walrus-binaries/site-builder-mainnet-latest-${SYSTEM}" -o /usr/local/bin/site-builder
    - chmod +x /usr/local/bin/site-builder
    - mkdir -p ~/.config/walrus
    - curl -sSfL "https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml" -o ~/.config/walrus/sites-config.yaml
    - mkdir -p ~/.sui/sui_config
    - echo "${SUI_KEYSTORE}" | base64 -d > ~/.sui/sui_config/sui.keystore
  script:
    - site-builder deploy --epochs 5 ./site
```

### CircleCI

```yaml
version: 2.1

jobs:
  deploy:
    docker:
      - image: cimg/base:2024.01
    steps:
      - checkout
      - run:
          name: Install site-builder
          command: |
            curl -sSfL "https://storage.googleapis.com/mysten-walrus-binaries/site-builder-mainnet-latest-linux-x86_64" -o ~/bin/site-builder
            chmod +x ~/bin/site-builder
            mkdir -p ~/.config/walrus
            curl -sSfL "https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml" -o ~/.config/walrus/sites-config.yaml
      - run:
          name: Restore keystore
          command: |
            mkdir -p ~/.sui/sui_config
            echo "${SUI_KEYSTORE}" | base64 -d > ~/.sui/sui_config/sui.keystore
      - run:
          name: Deploy site
          command: site-builder deploy --epochs 5 ./site

workflows:
  deploy:
    jobs:
      - deploy:
          filters:
            branches:
              only: main
```

### Bitbucket Pipelines

```yaml
pipelines:
  branches:
    main:
      - step:
          name: Deploy to Walrus Sites
          image: ubuntu:22.04
          script:
            - apt-get update && apt-get install -y curl
            - curl -sSfL "https://storage.googleapis.com/mysten-walrus-binaries/site-builder-mainnet-latest-linux-x86_64" -o /usr/local/bin/site-builder
            - chmod +x /usr/local/bin/site-builder
            - mkdir -p ~/.config/walrus
            - curl -sSfL "https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml" -o ~/.config/walrus/sites-config.yaml
            - mkdir -p ~/.sui/sui_config
            - echo "${SUI_KEYSTORE}" | base64 -d > ~/.sui/sui_config/sui.keystore
            - site-builder deploy --epochs 5 ./site
```

---

## Anti-patterns

- Committing the keystore file to the repository — use CI/CD secrets instead.
- Using the same wallet for CI/CD and manual operations — race conditions on nonce/gas objects. Create a dedicated CI/CD wallet.
- Forgetting to fund the CI/CD wallet with both SUI (gas) and WAL (storage).
- Not committing `ws-resources.json` after first deploy — subsequent runs will create new sites instead of updating.
- Using `epochs: 1` in CI/CD — the site may expire before the next deploy. Use at least 5 for Mainnet.
