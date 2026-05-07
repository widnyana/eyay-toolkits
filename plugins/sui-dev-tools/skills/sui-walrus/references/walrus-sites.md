# Walrus Sites Reference

Decentralized static website hosting on Sui + Walrus. A Walrus Site is a standard Sui object whose dynamic fields map URL paths to Walrus blob IDs. Site content is stored as Quilts on Walrus; the Sui object holds the routing metadata.

## Mental Model

**Publishing flow**: site-builder reads the local directory → uploads files as Quilts to Walrus → writes a site object on Sui with Resource dynamic fields mapping URL paths to blob IDs.

**Resolving/serving flow**: browser requests a URL → portal identifies the site (SuiNS name or Base36 object ID) → looks up the resource path in the Sui site object → fetches the corresponding blob from Walrus → returns the HTTP response.

**Domain isolation**: each site is served from a unique subdomain. Either a SuiNS name (`mysite.wal.app`) or a Base36-encoded object ID (`46f3881sp4r55fc6pcao9t93bieeejl4vr4k2uv8u4wwyx1a93.localhost:3000`). Use `site-builder convert <hex-id>` to get the Base36 form.

---

## site-builder CLI

### Install

```bash
# Via suiup (recommended)
curl -sSfL https://raw.githubusercontent.com/Mystenlabs/suiup/main/install.sh | sh
suiup install site-builder@mainnet

# Via pre-built binary
curl https://storage.googleapis.com/mysten-walrus-binaries/site-builder-mainnet-latest-$SYSTEM -o site-builder
chmod +x site-builder
```

The `$SYSTEM` variable maps to: `linux-x86_64`, `linux-aarch64`, `macos-x86_64`, `macos-aarch64`.

### Configuration file: `sites-config.yaml`

site-builder looks for this file in order: current directory, `$XDG_CONFIG_HOME/walrus/sites-config.yaml`, `$HOME/.config/walrus/sites-config.yaml`. Download:

```bash
# Mainnet
curl https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml \
  -o ~/.config/walrus/sites-config.yaml

# Testnet
curl https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/testnet/sites-config.yaml \
  -o ~/.config/walrus/sites-config.yaml
```

Pass a custom path with `--config`:
```bash
site-builder --config /path/to/sites-config.yaml deploy --epochs 5 ./site
```

Structure:
```yaml
contexts:
  testnet:
    package: 0xf99aee9f21493e1590e7e5a9aea6f343a1f381031a04a732724871fc294be799
    staking_object: 0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3
    general:
      wallet_env: testnet
      walrus_context: testnet
      walrus_package: 0xd84704c17fc870b8764832c535aa6b11f21a95cd6f5bb38a9b07d2cf42220c66
  mainnet:
    package: 0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27
    general:
      wallet_env: mainnet
      walrus_context: mainnet
default_context: mainnet
```

### Commands

#### deploy

Publishes a new site or updates an existing one. On first deploy, `site-builder` writes the `object_id` back to `ws-resources.json` automatically.

```bash
# New site
site-builder deploy --epochs <EPOCHS> <DIRECTORY>

# Update existing site (object_id from ws-resources.json or --object-id flag)
site-builder deploy --object-id <OBJECT_ID> --epochs <EPOCHS> <DIRECTORY>

# With custom config
site-builder --config /path/to/sites-config.yaml deploy --epochs 5 ./site

# With custom gas budget (default 0.5 SUI)
site-builder deploy --epochs 5 --gas-budget 100000000 ./site

# With custom ws-resources path
site-builder deploy --epochs 5 --ws-resources ./my-resources.json ./site
```

Object ID resolution order: `--object-id` flag > `object_id` field in `ws-resources.json` > new site creation.

#### convert

Convert a hex object ID to Base36 (for use in portal URLs):

```bash
site-builder convert <hex-object-id>
```

#### sitemap

Display the URL-to-blob mapping for a deployed site:

```bash
site-builder sitemap --object-id <OBJECT_ID>
```

#### update-resource

Update a single resource in an existing site without full redeploy:

```bash
site-builder update-resource --object-id <OBJECT_ID> --resource-path /path/to/file
```

#### destroy

Remove a site's resources from Walrus and delete the Sui site object:

```bash
site-builder destroy --object-id <OBJECT_ID>
```

#### list-directory

List the resources in a site object:

```bash
site-builder list-directory --object-id <OBJECT_ID>
```

---

## Portal Deployment

A portal is a service that resolves browser requests → Sui lookups → Walrus retrieval → HTTP response. The portal network must match the site's network.

### Quick Start: Docker (programmatic)

```bash
# Download and run
curl -O https://raw.githubusercontent.com/MystenLabs/walrus-sites/main/scripts/local-docker-portal.sh
chmod +x local-docker-portal.sh

# Mainnet portal
./local-docker-portal.sh mainnet

# Testnet portal
./local-docker-portal.sh testnet

# Custom landing page
./local-docker-portal.sh mainnet <base36-oid>
```

Portal serves at `http://localhost:3000`. Access sites via `http://<base36-oid>.localhost:3000`.

The script auto-generates `portal-config.yaml` based on the installed site-builder version.

### Manual Docker

Clone the repo and copy the template config:
```bash
git clone https://github.com/MystenLabs/walrus-sites.git
cd walrus-sites
git checkout mainnet

# Mainnet
cp portal/server/portal-config.mainnet.example.yaml portal/server/portal-config.yaml
# Testnet
cp portal/server/portal-config.testnet.example.yaml portal/server/portal-config.yaml
```

Get the version tag (must match the Docker image version):
```bash
site-builder -V | awk '{ print $2 }' | awk -F - '{ printf("v%s\n", $1) }'
```

Run:
```bash
docker run \
  -it \
  --rm \
  -v $(pwd)/portal/server/portal-config.yaml:/portal-config.yaml:ro \
  -e PORTAL_CONFIG=/portal-config.yaml \
  -p 3000:3000 \
  mysten/walrus-sites-server-portal:mainnet-<version>
```

### Local Development (bun)

```bash
# Install bun
curl -fsSL https://bun.sh/install | bash

# Clone and setup
git clone https://github.com/MystenLabs/walrus-sites.git
cd walrus-sites
git checkout mainnet

# Server-side portal (localhost:3000)
cp portal/server/portal-config.mainnet.example.yaml portal/server/portal-config.yaml
bun install
bun run server

# Service-worker portal (localhost:8080)
cp portal/worker/.env.mainnet.example portal/worker/.env.local
bun run build:worker
bun run worker
```

### Public Portal

`https://wal.app` is the Walrus Foundation public portal. It **only serves Mainnet sites with SuiNS domain names**. No public Testnet portal exists.

A list of community portals is in `docs/site/static/portals.json` in the `walrus-sites` repo.

---

## Portal Configuration: `portal-config.yaml`

```yaml
network: mainnet  # or testnet
site_package: "0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27"
landing_page_oid_b36: "46f3881sp4r55fc6pcao9t93bieeejl4vr4k2uv8u4wwyx1a93"
enable_allowlist: false
enable_blocklist: false
b36_domain_resolution: true
bring_your_own_domain: false
rpc_urls:
  - url: https://fullnode.mainnet.sui.io:443
    retries: 2
    metric: 100
aggregator_urls:
  - url: https://aggregator.walrus-mainnet.walrus.space
    retries: 3
    metric: 100
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `network` | string | Yes | `mainnet` or `testnet` |
| `site_package` | string | Yes | On-chain Walrus Sites Move package address. Differs per network, changes after upgrades. |
| `landing_page_oid_b36` | string | Yes | Base36 OID of the site served at the portal root. |
| `domain_name_length` | integer | Yes | Characters in a valid Base36 subdomain. Default: 21. |
| `b36_domain_resolution` | boolean | Yes | Resolve Base36 subdomains to site objects. Default: true. |
| `bring_your_own_domain` | boolean | Yes | Support custom domains. Default: false. |
| `enable_blocklist` | boolean | Yes | Reject blocklisted sites. Requires `BLOCKLIST_REDIS_URL` env var. |
| `enable_allowlist` | boolean | Yes | Serve only allowlisted sites. Requires `ALLOWLIST_REDIS_URL` env var and `premium_rpc_urls`. |
| `rpc_urls` | list | Yes | Sui full node RPC endpoints. Tried in ascending `metric` order. |
| `premium_rpc_urls` | list | Conditional | RPC endpoints for allowlisted sites. Required when `enable_allowlist: true`. |
| `aggregator_urls` | list | Yes | Walrus aggregator endpoints. Same structure as `rpc_urls`. |

### Environment Variable Overrides

All `portal-config.yaml` fields can be overridden by environment variables (set in `.env.local`). Env vars take precedence.

| Variable | Required when |
|---|---|
| `BLOCKLIST_REDIS_URL` | `enable_blocklist: true` |
| `ALLOWLIST_REDIS_URL` | `enable_allowlist: true` |
| `EDGE_CONFIG` | Using Vercel Edge Config |
| `EDGE_CONFIG_ALLOWLIST` | Using Vercel Edge Config allowlist |

### Network Constants

**Mainnet**:
- Site package: `0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27`
- RPC: `https://fullnode.mainnet.sui.io:443`
- Aggregator: `https://aggregator.walrus-mainnet.walrus.space`
- Landing page (Base36): `46f3881sp4r55fc6pcao9t93bieeejl4vr4k2uv8u4wwyx1a93`
- Epoch duration: 14 days
- Public portal: `wal.app` (SuiNS names only)

**Testnet**:
- Site package: `0xf99aee9f21493e1590e7e5a9aea6f343a1f381031a04a732724871fc294be799`
- RPC: `https://fullnode.testnet.sui.io:443`
- Aggregator: `https://aggregator.walrus-testnet.walrus.space`
- Landing page (Base36): `1p3repujoigwcqrk0w4itsxm7hs7xjl4hwgt3t0szn6evad83q`
- Epoch duration: 1 day
- Public portal: none (self-host required)

---

## Site Configuration: `ws-resources.json`

Optional file in the site root. **Not uploaded to Walrus or served to visitors.** Field names use `snake_case`.

```json
{
  "headers": {
    "/index.html": {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "max-age=3500"
    }
  },
  "routes": {
    "/*": "/index.html",
    "/accounts/*": "/accounts.html",
    "/path/assets/*": "/assets/asset_router.html"
  },
  "metadata": {
    "link": "https://subdomain.wal.app",
    "image_url": "https://www.walrus.xyz/walrus-site",
    "description": "This is a walrus site.",
    "project_url": "https://github.com/MystenLabs/walrus-sites/",
    "creator": "MystenLabs"
  },
  "redirects": {
    "/old-path": { "location": "/new-path", "status": 301 },
    "/temp-move": { "location": "/somewhere", "status": 302 }
  },
  "site_name": "My Walrus Site",
  "object_id": "0xe674c144119a37a0ed9cef26a962c3fdfbdbfd86a3b3db562ee81d5542a4eccf",
  "ignore": ["/private/*", "/secret.txt", "/images/tmp/*"]
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `headers` | object | Custom HTTP response headers per file path. Overrides portal defaults. |
| `routes` | object | Client-side routing rules (rewrites, not redirects). Browser URL never changes. |
| `redirects` | object | Server-side redirects with HTTP status codes (301, 302, 308). Performed by the portal. |
| `metadata` | object | Human-readable info displayed in Sui explorers and wallets. |
| `site_name` | string | Display name. Overridden by `--site-name` CLI flag. |
| `object_id` | string | Sui object ID of the deployed site. Auto-populated after first deploy. |
| `ignore` | array | File paths to exclude from upload. Patterns start with `/`, wildcards only in last position. |

### Headers

Attach custom HTTP response headers to specific resources:

```json
{
  "headers": {
    "/index.html": {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "max-age=3500"
    },
    "/assets/main.js": {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  }
}
```

### Routes (Client-Side Rewrites)

All routing is a **rewrite** (not a redirect). The browser URL does not change. There is no server — redirects must be implemented client-side.

```json
{
  "routes": {
    "/*": "/index.html",
    "/accounts/*": "/accounts.html",
    "/admin/settings/*": "/admin.html"
  }
}
```

Routes are stored on-chain and validated at deploy time.

### Redirects (Server-Side)

Unlike `routes` (rewrites), `redirects` perform actual HTTP redirects. The browser URL changes. Supported status codes: `301` (permanent), `302` (temporary), `308` (permanent, preserves method).

```json
{
  "redirects": {
    "/old-page": { "location": "/new-page", "status": 301 },
    "/legacy/*": { "location": "/modern/", "status": 308 }
  }
}
```

Redirects are resolved by the portal, not the client. They count toward the portal's maximum redirect depth (3 on `wal.app`).

### Metadata

Enhances display of the Site object on Sui explorers and wallets:

```json
{
  "metadata": {
    "link": "https://subdomain.wal.app",
    "image_url": "https://www.walrus.xyz/walrus-site",
    "description": "This is a walrus site.",
    "project_url": "https://github.com/MystenLabs/walrus-sites/",
    "creator": "MystenLabs"
  }
}
```

### Ignore Patterns

Exclude files from deployment. Each pattern must start with `/`. Wildcards (`*`) only supported in the **last position**:

```json
{
  "ignore": ["/private/*", "/secret.txt", "/images/tmp/*"]
}
```

`/foo/*` is valid. `/foo/*/bar` is **not** valid.

### Serving Raw Markdown

Two entries required in `ws-resources.json` — a header (note: `content-type` must be lowercase) and a route:

```json
{
  "headers": {
    "/markdown/docs/guide.md": {
      "Content-Disposition": "inline",
      "content-type": "text/markdown; charset=utf-8"
    }
  },
  "routes": {
    "/docs/guide.md": "/markdown/docs/guide.md"
  }
}
```

---

## Known Restrictions

### No secret values

Site metadata is on Sui (public), content is on Walrus (public). Never store secrets in a Walrus Site. Use Sui wallet integration for auth and backend-specific operations.

### Maximum redirect depth

Portals cap consecutive redirects. `wal.app` has a max depth of 3. Different portals may set different limits.

### Reserved `__wal__` path

Anything under `/__wal__/*` is reserved by the portal for health checks and internal operations. Site resources at this path will not load correctly.

### Service-worker portal limitations

These apply only to service-worker portals, not server-side portals:

- **Cannot serve sites based on service-workers**: Service-workers cannot be stacked. Installing a service-worker from within a Walrus Site results in a dysfunctional site.
- **No iOS Sui wallet support**: WebKit blocks service-workers in iOS in-app browsers. Sui wallet apps on iOS cannot use service-worker portals. Redirect to a server-side portal (`wal.app`) for iOS wallet users.
- **No PWA support**: Service-worker portals cannot serve PWAs. Only one service-worker per origin; registering a PWA's service-worker would remove the portal's service-worker.

Sites that must support service-workers, iOS wallets, or PWAs should use a **server-side portal**.

---

## Troubleshooting

### Configuration Errors

**`site-builder: command not found`**
Binary not in `$PATH`. Move to a directory in `$PATH` or add its location:
```bash
export PATH=$PATH:/path/to/site-builder-directory
```

**`No such file or directory: sites-config.yaml`**
Download the config for your network:
```bash
curl https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml \
  -o ~/.config/walrus/sites-config.yaml
```

**`the specified Walrus system object does not exist`**
Outdated `sites-config.yaml` or Testnet wipe. Download the latest config and verify `wallet_env` / `walrus_context` match your target network.

### Deployment Errors

**`could not retrieve enough confirmations to certify the blob`**
Walrus storage nodes unavailable or config points to inactive system. Update config and retry. Check Walrus Discord for Testnet status.

**`InsufficientCoinBalance` or `GasBudgetTooLow`**
Not enough SUI (gas) or WAL (storage). For large sites, increase gas budget:
```bash
site-builder deploy --gas-budget 100000000 --epochs 5 ./site
```

**`The wallet must own the site object to update it`**
Wrong wallet. Transfer ownership:
```bash
sui client transfer --object-id SITE_OBJECT_ID --to NEW_WALLET_ADDRESS --gas-budget 10000000
```

**Deploy publishes a new site instead of updating**
Missing `object_id`. Pass it explicitly:
```bash
site-builder deploy --object-id OBJECT_ID --epochs EPOCHS ./site
```
After first deploy, `site-builder` auto-writes `object_id` to `ws-resources.json`.

### Browsing Errors

**Site does not load on `wal.app`**
`wal.app` only serves Mainnet sites with SuiNS names. For Testnet or Mainnet sites without SuiNS, run a local portal.

**SuiNS name resolves to wrong site**
SuiNS record points to a different object ID. Update the SuiNS record and wait for propagation. Hard-refresh browser.

**404 on direct URL access (SPAs)**
Portal fetches URL paths as files. For SPAs, add a catch-all route in `ws-resources.json`:
```json
{ "routes": { "/*": "/index.html" } }
```

**HTTP 503 with restrictive CSP headers**
Remove restrictive CSP/security headers from `ws-resources.json` (`Content-Security-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`). They conflict with the portal's route resolution.

---

## Local Tunnel

To expose the local portal to the internet for external review or cross-device testing, load **`references/local-tunnel.md`** for tunnel setup with cloudflared, localtunnel, or ngrok.

---

## Ownership Model

The site object is a standard Sui object owned by the deployer's address. Only the owner can update or destroy the site. Transfer ownership with `sui client transfer`.

To verify ownership, look up the site's object ID in a Sui explorer. The owner address must match the wallet used for `site-builder deploy`.

---

## Anti-patterns

- ❌ Expecting `wal.app` to serve Testnet sites or Mainnet sites without SuiNS — run a local portal instead.
- ❌ Storing secrets in a Walrus Site — all content is public on Sui and Walrus.
- ❌ Using `/__wal__/*` paths in a site — reserved by the portal.
- ❌ Deploying a service-worker-based site to a service-worker portal — cannot stack service-workers.
- ❌ Forgetting `"/*": "/index.html"` route in `ws-resources.json` for SPAs — direct URL access returns 404.
