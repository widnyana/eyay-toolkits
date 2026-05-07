# Local Tunnel for Walrus Sites Portal

Expose a local portal (`localhost:3000`) to the internet for external review, cross-device testing, or CI integration.

## Prerequisites

A local portal must already be running (see "Portal Deployment" in `references/walrus-sites.md`). Tunnels forward an external hostname to `localhost:3000`.

## Options

### cloudflared (Cloudflare Tunnel)

No account required for quick tunnels:

```bash
# Install (if not already installed)
# macOS: brew install cloudflared
# Linux: curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared && chmod +x cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:3000
```

Outputs a `https://<random>.trycloudflare.com` URL. No signup, no expiry during the session.

### localtunnel

```bash
# No install needed — use npx
npx localtunnel --port 3000
```

Outputs a `https://<random>.loca.lt` URL. May show an interstitial confirmation page on first visit.

### ngrok

```bash
# Install: https://ngrok.com/download
ngrok http 3000
```

Outputs a `https://<random>.ngrok-free.app` URL. Free tier has bandwidth and connection limits.

## Usage with Walrus Sites

After the tunnel is running, access sites via the tunnel URL:

```
https://<base36-oid>.<tunnel-domain>
```

Example with cloudflared:

1. Start the local portal: `./local-docker-portal.sh mainnet`
2. In another terminal, start the tunnel: `cloudflared tunnel --url http://localhost:3000`
3. Visit: `https://46f3881sp4r55fc6pcao9t93bieeejl4vr4k2uv8u4wwyx1a93.<random>.trycloudflare.com`

## Caveats

- **Subdomain resolution**: The portal extracts the Base36 site ID from the subdomain. The tunnel must pass the full hostname through (all three tools above do this by default).
- **HTTPS**: Tunnels provide HTTPS automatically. The portal itself serves plain HTTP on localhost — no TLS config needed.
- **Latency**: Every request traverses local portal → tunnel → client. Expect higher latency than `wal.app`.
- **Session-bound**: Quick tunnels (cloudflared, localtunnel) generate a new random URL each session. For stable URLs, use cloudflared named tunnels or ngrok paid tiers.
- **WebSocket**: Not relevant for Walrus Sites (static content only), but note that some tunnel services may not proxy WebSocket connections.
