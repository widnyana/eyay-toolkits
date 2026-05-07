# Walrus Sites: Custom Domains

Serve a Walrus Site under your own domain (e.g. `mysite.com`) instead of the default `*.wal.app` subdomain. Requires a self-hosted portal.

---

## Overview

By default, Walrus Sites are accessed via Base36 subdomains on a portal (e.g. `46f3881...localhost:3000`) or SuiNS names on `wal.app`. Custom domains let visitors use `mysite.com` directly.

The portal resolves the domain to a site object ID, then serves content from Walrus as normal. DNS configuration maps the domain to the portal's IP.

---

## Portal Configuration

### Enable Custom Domains

In `portal-config.yaml`, set:

```yaml
bring_your_own_domain: true
```

This tells the portal to resolve incoming requests by matching the `Host` header against on-chain domain-to-site mappings.

### Full Minimal Config

```yaml
network: mainnet
site_package: "0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27"
landing_page_oid_b36: "46f3881sp4r55fc6pcao9t93bieeejl4vr4k2uv8u4wwyx1a93"
bring_your_own_domain: true
b36_domain_resolution: true
enable_allowlist: false
enable_blocklist: false
rpc_urls:
  - url: https://fullnode.mainnet.sui.io:443
    retries: 2
    metric: 100
aggregator_urls:
  - url: https://aggregator.walrus-mainnet.walrus.space
    retries: 3
    metric: 100
```

---

## DNS Configuration

### A Record (apex domain)

Point the apex domain (`mysite.com`) to the portal server's IP:

```
Type: A
Name: @
Value: <portal-server-ip>
TTL: 300
```

### CNAME Record (subdomain)

Point a subdomain (`www.mysite.com` or `app.mysite.com`) to the portal:

```
Type: CNAME
Name: www
Value: <portal-hostname-or-ip>
TTL: 300
```

### Wildcard Subdomain (optional)

To serve multiple Walrus Sites on subdomains under your domain:

```
Type: CNAME
Name: *
Value: <portal-hostname>
TTL: 300
```

### DNS Propagation

DNS changes propagate within minutes (most providers) to 48 hours (worst case). Verify with:

```bash
dig mysite.com
dig www.mysite.com
```

---

## HTTPS / TLS

The portal itself does not terminate TLS. Use a reverse proxy in front of the portal.

### Option A: Nginx + Certbot

```nginx
server {
    listen 80;
    server_name mysite.com www.mysite.com;
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name mysite.com www.mysite.com;

    ssl_certificate /etc/letsencrypt/live/mysite.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mysite.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Obtain certificates:

```bash
sudo certbot --nginx -d mysite.com -d www.mysite.com
```

### Option B: Caddy (automatic HTTPS)

```
mysite.com, www.mysite.com {
    reverse_proxy localhost:3000
}
```

Caddy auto-provisions and renews Let's Encrypt certificates.

---

## Domain-to-Site Mapping

The portal resolves custom domains by looking up the domain name in an on-chain registry. The site owner must register the domain mapping on Sui (this is handled by the Walrus Sites Move package when `bring_your_own_domain` is enabled).

The mapping flow:
1. Deploy the site with `site-builder deploy`
2. Register the custom domain on-chain (via the portal's domain management interface or a Sui transaction)
3. Configure DNS to point to the portal
4. Portal receives request → looks up domain in on-chain registry → fetches site content from Walrus

---

## Anti-patterns

- Pointing DNS to `wal.app` — the public portal does not support custom domains (`bring_your_own_domain` is not enabled). Self-host a portal instead.
- Forgetting the reverse proxy for HTTPS — browsers will block mixed content on HTTP-only custom domains.
- Using a CNAME for the apex domain — some DNS providers don't support CNAME at apex; use an A record instead.
