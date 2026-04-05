# realm-sigil — Unified Versioning System

**Date:** 2026-04-05
**Status:** Approved

## Problem

JP's projects have inconsistent or missing version endpoints. The openclaw status page has no generic way to poll version info from services — it hardcodes game server protocols and `openclaw --version`. There's no unified convention, making monitoring fragile and incomplete.

## Solution

A shared library with Go, Python, and JS implementations of:
1. A deterministic magical name generator (git hash + themed realm → "Blazing Crown · e4f5a6b")
2. A standardized `/api/version` JSON response
3. Per-language endpoint helpers (one-liner integration)
4. A static page build script for sites without servers

## Name Generator

Takes a git short hash (7 chars) and a realm string. Uses the hash as a numeric seed to pick an adjective + noun from themed word lists. Same hash always produces the same name.

```
sigil("e4f5a6b", "fantasy") → "Blazing Crown · e4f5a6b"
sigil("e4f5a6b", "oracle")  → "Prophetic Omen · e4f5a6b"
```

Algorithm:
```
seed = parseInt(hash, 16)
adjective = realm.adjectives[seed % len(adjectives)]
noun = realm.nouns[(seed >> 8) % len(nouns)]
return "{adjective} {noun} · {hash}"
```

## Realms

7 themed word pools, each with 20 adjectives × 20 nouns (400 combinations).

| Realm | Flavor | Projects |
|-------|--------|----------|
| `fantasy` | Arcane, Blazing, Crown, Aegis | realmwatch, realm-portal, realmcoin, os.realm.watch |
| `tarot` | Mystic, Celestial, Tower, Amulet | artcardsv5 |
| `oracle` | Prophetic, Veiled, Sight, Omen | oracle, the-oracle |
| `void` | Obsidian, Null, Phantom, Drift | dreamspace |
| `forge` | Tempered, Molten, Anvil, Spark | techempower |
| `signal` | Echo, Pulse, Whisper, Wave | speech-to-cli, cloud-chat-assistant |
| `stellar` | Nova, Quasar, Nebula, Orbit | opus |

Canonical word lists: `words/realms.json` (single source of truth for all languages).

## JSON Contract

Every service responds to `GET /api/version` (HTTP) or serves `/version.json` (static) with:

```json
{
  "name": "dreamspace",
  "description": "Creative collage tool with AI generation",
  "version": "Blazing Crown · e4f5a6b",
  "hash": "e4f5a6b",
  "branch": "main",
  "dirty": false,
  "built": "2026-04-05T12:30:00Z",
  "started": "2026-04-05T10:00:00Z",
  "uptime": 9000,
  "realm": "void",
  "runtime": "go1.24.2",
  "os": "linux/amd64",
  "host": "openclaw",
  "pid": 12345,
  "repo": "https://github.com/jphein/dreamspace",
  "commit_url": "https://github.com/jphein/dreamspace/commit/e4f5a6b"
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Project identifier |
| `description` | string | yes | One-line project description |
| `version` | string | yes | Magical display name ("Adj Noun · hash") |
| `hash` | string | yes | Git short hash (7 chars) |
| `branch` | string | yes | Git branch at build time |
| `dirty` | bool | yes | Working tree dirty at build time |
| `built` | string | yes | ISO 8601 build timestamp |
| `started` | string | no | ISO 8601 process start time (servers only) |
| `uptime` | int | no | Seconds since process start (servers only) |
| `realm` | string | yes | Theme used for name generation |
| `runtime` | string | no | Language/runtime version (servers only) |
| `os` | string | no | Platform (servers only) |
| `host` | string | no | Hostname (servers only) |
| `pid` | int | no | Process ID (servers only) |
| `repo` | string | yes | GitHub repo URL |
| `commit_url` | string | yes | Direct link to the built commit |

Static pages omit: `started`, `uptime`, `pid`, `runtime`, `os`, `host`.

## Library Structure

```
realm-sigil/
├── go/
│   ├── sigil.go          # Name generator + Version struct
│   ├── handler.go        # http.HandlerFunc for /api/version
│   ├── realms.go         # Embedded word lists (generated from realms.json)
│   └── go.mod
├── python/
│   ├── realm_sigil/
│   │   ├── __init__.py   # generate_name(), version_dict(), __version__
│   │   ├── realms.py     # Word lists (generated from realms.json)
│   │   └── handler.py    # WSGI/handler helpers
│   └── pyproject.toml
├── js/
│   ├── index.js          # generateName(), versionObject()
│   ├── realms.js         # Word lists (generated from realms.json)
│   ├── handler.js        # Express/Next.js/Vercel handler
│   └── package.json
├── static/
│   └── build.sh          # Generates version.json + meta tag for static sites
├── words/
│   └── realms.json       # Single source of truth for all word lists
├── sync-words.sh         # Generates realms.go, realms.py, realms.js from realms.json
├── CLAUDE.md
└── README.md
```

## Per-Project Integration

### Go services (dreamspace, realm-portal, realmcoin, oracle)

Makefile injects build info via ldflags:
```makefile
VERSION := $(shell git rev-parse --short HEAD)
BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
DIRTY := $(shell git diff --quiet && echo false || echo true)
BUILD_TIME := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)

LDFLAGS := -X 'github.com/jphein/realm-sigil/go.Hash=$(VERSION)' \
           -X 'github.com/jphein/realm-sigil/go.Branch=$(BRANCH)' \
           -X 'github.com/jphein/realm-sigil/go.Dirty=$(DIRTY)' \
           -X 'github.com/jphein/realm-sigil/go.Built=$(BUILD_TIME)'

build:
	go build -ldflags "$(LDFLAGS)" -o bin/app .
```

One-liner in main.go:
```go
http.Handle("/api/version", sigil.Handler("dreamspace", "Creative collage tool", "void",
    "https://github.com/jphein/dreamspace"))
```

### Python server (realmwatch)

```python
from realm_sigil import version_handler
# In route setup:
routes["/api/version"] = version_handler(
    "realmwatch", "Fantasy homelab network monitor", "fantasy",
    "https://github.com/jphein/realmwatch")
```

### Next.js (techempower)

```js
// pages/api/version.js
import { nextHandler } from 'realm-sigil'
export default nextHandler('techempower', 'Tech empower platform', 'forge',
    'https://github.com/jphein/techempower')
```

### Vercel (artcardsv5)

```js
// api/version.js
import { vercelHandler } from 'realm-sigil'
export default vercelHandler('artcardsv5', 'Imaginal art card creator', 'tarot',
    'https://github.com/jphein/artcardsv5')
```

### Static pages (opus)

```bash
# In deploy script or CI
./realm-sigil/static/build.sh \
    --name opus \
    --description "Claude Opus 4.6 info page" \
    --realm stellar \
    --repo https://github.com/jphein/opus \
    --html index.html
# Outputs: version.json + updates <meta> tag in index.html
```

## Status Page Integration

### checks.json addition

```json
"version": [
  {"name": "dreamspace", "url": "https://dreamscape.imaginalvision.com/api/version"},
  {"name": "realm-portal", "url": "http://100.69.161.127:8080/api/version"},
  {"name": "realmwatch", "url": "http://localhost:80/api/version"},
  {"name": "opus", "url": "https://jphein.github.io/opus/version.json"},
  {"name": "artcardsv5", "url": "https://artcards.imaginalvision.com/api/version"},
  {"name": "techempower", "url": "https://techempower-url/api/version"},
  {"name": "oracle", "url": "http://100.x.x.x:port/api/version"},
  {"name": "realmcoin", "url": "http://100.x.x.x:port/api/version"}
]
```

### check.sh changes

New function `check_versions()`:
- Iterates version array from checks.json
- curl each URL (5s timeout)
- Parse JSON, extract fields
- Include in status.json under `"versions"` key

### index.html changes

New "Service Versions" section:
- Card per service showing: magical name, hash (linked to commit), branch, uptime, dirty warning
- Realm-colored accent per card
- Click card to expand: description, runtime, host, PID, build time

### edit.html changes

New "Version Endpoints" section with name + URL fields, drag-and-drop reorder, add/delete.

## Implementation Order

1. **realm-sigil core** — word lists, sync script, Go/Python/JS generators
2. **Go library** — sigil.go, handler.go, go.mod (test with realm-portal first)
3. **Python library** — realm_sigil package (integrate with realmwatch)
4. **JS library** — index.js, handler.js (integrate with techempower, artcardsv5)
5. **Static builder** — build.sh for opus and future static sites
6. **Status page** — check.sh version probing, index.html cards, edit.html section
7. **Per-project integration** — add /api/version to each project
