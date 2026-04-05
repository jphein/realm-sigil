# realm-sigil Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate realm-sigil versioning into all JP projects and update the openclaw status page to poll and display version cards.

**Architecture:** Each project gets a `/api/version` endpoint (or `/version.json` for static sites) using the realm-sigil library. Go projects use the library as a local module replace. Python projects import directly. JS projects use a local file path dependency. The openclaw status page gets a new `version` config section and a "Service Versions" dashboard section.

**Tech Stack:** Go (ldflags), Python (realm_sigil package), JavaScript (Node.js/Vercel), Bash (static builder), HTML/CSS/JS (status page dashboard)

---

### Task 1: Integrate realm-sigil into realm-portal (Go — already has /api/version)

realm-portal already has a basic `/api/version` at `/home/jp/Projects/realm-portal/main.go:1738-1745`. Replace it with the realm-sigil handler.

**Files:**
- Modify: `/home/jp/Projects/realm-portal/go.mod` (add realm-sigil replace directive)
- Modify: `/home/jp/Projects/realm-portal/main.go:1738-1745` (replace inline handler with sigil.Handler)
- Modify: `/home/jp/Projects/realm-portal/Makefile:5-12` (update ldflags to target sigil package)

- [ ] **Step 1: Add realm-sigil dependency to go.mod**

Add to `/home/jp/Projects/realm-portal/go.mod`:
```
require github.com/jphein/realm-sigil/go v0.0.0

replace github.com/jphein/realm-sigil/go => /home/jp/Projects/realm-sigil/go
```

- [ ] **Step 2: Update Makefile ldflags to target sigil package**

Current Makefile at `/home/jp/Projects/realm-portal/Makefile` lines 5-7:
```makefile
VERSION   := $(shell git rev-parse --short HEAD)
BUILD_TIME := $(shell date -u +%Y-%m-%d\ %H:%M\ UTC)
LDFLAGS   := -X 'main.version=$(VERSION)' -X 'main.buildTime=$(BUILD_TIME)'
```

Replace with:
```makefile
VERSION    := $(shell git rev-parse --short HEAD)
BRANCH     := $(shell git rev-parse --abbrev-ref HEAD)
DIRTY      := $(shell git diff --quiet && echo false || echo true)
BUILD_TIME := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
SIGIL      := github.com/jphein/realm-sigil/go
LDFLAGS    := -X '$(SIGIL).Hash=$(VERSION)' -X '$(SIGIL).Branch=$(BRANCH)' \
              -X '$(SIGIL).Dirty=$(DIRTY)' -X '$(SIGIL).Built=$(BUILD_TIME)'
```

- [ ] **Step 3: Replace inline /api/version handler with sigil.Handler**

In `/home/jp/Projects/realm-portal/main.go`, add import:
```go
sigil "github.com/jphein/realm-sigil/go"
```

Replace lines 1738-1745 (the existing `/api/version` handler) with:
```go
mux.HandleFunc("/api/version", sigil.Handler(
    "realm-portal", "Unified homelab portal", "fantasy",
    "https://github.com/jphein/realm-portal"))
```

- [ ] **Step 4: Remove old version variables from main.go**

Remove the old `var version` and `var buildTime` declarations (lines 32-34) since sigil now owns those via its own package vars.

- [ ] **Step 5: Verify it compiles**

Run: `cd /home/jp/Projects/realm-portal && make build`
Expected: Compiles without errors. Binary at `bin/` directory.

- [ ] **Step 6: Commit**

```bash
cd /home/jp/Projects/realm-portal
git add go.mod go.sum main.go Makefile
git commit -m "feat: replace version endpoint with realm-sigil (fantasy realm)"
```

---

### Task 2: Integrate realm-sigil into dreamspace (Go — has ldflags, needs endpoint)

dreamspace already has `Version` injected via ldflags at `/home/jp/Projects/dreamspace/main.go` and `Makefile:5,28`. Add the sigil handler.

**Files:**
- Modify: `/home/jp/Projects/dreamspace/go.mod` (add realm-sigil)
- Modify: `/home/jp/Projects/dreamspace/main.go` (add /api/version route, remove old Version var)
- Modify: `/home/jp/Projects/dreamspace/Makefile` (update ldflags)

- [ ] **Step 1: Add realm-sigil dependency to go.mod**

Add to `/home/jp/Projects/dreamspace/go.mod`:
```
require github.com/jphein/realm-sigil/go v0.0.0

replace github.com/jphein/realm-sigil/go => /home/jp/Projects/realm-sigil/go
```

- [ ] **Step 2: Update Makefile ldflags**

Current line 5:
```makefile
VERSION := $(shell git rev-parse --short HEAD 2>/dev/null || echo "dev")
```
Current line 28:
```makefile
$(GO) build -ldflags "-X main.Version=$(VERSION)" -o $(BIN) .
```

Replace line 5 with:
```makefile
VERSION    := $(shell git rev-parse --short HEAD 2>/dev/null || echo "dev")
BRANCH     := $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
DIRTY      := $(shell git diff --quiet 2>/dev/null && echo false || echo true)
BUILD_TIME := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
SIGIL      := github.com/jphein/realm-sigil/go
```

Replace line 28 build command's ldflags with:
```makefile
$(GO) build -ldflags "-X '$(SIGIL).Hash=$(VERSION)' -X '$(SIGIL).Branch=$(BRANCH)' -X '$(SIGIL).Dirty=$(DIRTY)' -X '$(SIGIL).Built=$(BUILD_TIME)'" -o $(BIN) .
```

- [ ] **Step 3: Add /api/version route to main.go**

Add import:
```go
sigil "github.com/jphein/realm-sigil/go"
```

Add route in the API endpoints block (after line ~228):
```go
http.HandleFunc("/api/version", sigil.Handler(
    "dreamspace", "Creative collage tool with AI generation", "void",
    "https://github.com/jphein/dreamspace"))
```

- [ ] **Step 4: Remove old Version variable**

Remove `var Version = "dev"` from main.go (no longer needed since sigil owns its own Hash var). Search for any references to `Version` in main.go and replace them with `sigil.Hash` if needed (e.g., in curator panel responses).

- [ ] **Step 5: Verify it compiles**

Run: `cd /home/jp/Projects/dreamspace && make build`
Expected: Compiles without errors.

- [ ] **Step 6: Commit**

```bash
cd /home/jp/Projects/dreamspace
git add go.mod go.sum main.go Makefile
git commit -m "feat: add realm-sigil /api/version endpoint (void realm)"
```

---

### Task 3: Integrate realm-sigil into oracle (Go — no ldflags, has /api/health)

oracle at `/home/jp/Projects/oracle/` has no version injection. Add ldflags and sigil handler next to the existing `/api/health` at `main.go:162`.

**Files:**
- Modify: `/home/jp/Projects/oracle/go.mod` (add realm-sigil)
- Modify: `/home/jp/Projects/oracle/main.go:162` (add /api/version near /api/health)
- Modify: `/home/jp/Projects/oracle/Makefile:8` (add ldflags)

- [ ] **Step 1: Add realm-sigil dependency to go.mod**

Add to `/home/jp/Projects/oracle/go.mod`:
```
require github.com/jphein/realm-sigil/go v0.0.0

replace github.com/jphein/realm-sigil/go => /home/jp/Projects/realm-sigil/go
```

- [ ] **Step 2: Update Makefile with ldflags**

Current line 8:
```makefile
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 /snap/bin/go build -o $(BINARY) .
```

Add before the build target:
```makefile
VERSION    := $(shell git rev-parse --short HEAD 2>/dev/null || echo "dev")
BRANCH     := $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
DIRTY      := $(shell git diff --quiet 2>/dev/null && echo false || echo true)
BUILD_TIME := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
SIGIL      := github.com/jphein/realm-sigil/go
```

Update build line to:
```makefile
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 /snap/bin/go build -ldflags "-X '$(SIGIL).Hash=$(VERSION)' -X '$(SIGIL).Branch=$(BRANCH)' -X '$(SIGIL).Dirty=$(DIRTY)' -X '$(SIGIL).Built=$(BUILD_TIME)'" -o $(BINARY) .
```

- [ ] **Step 3: Add /api/version route next to /api/health**

Add import:
```go
sigil "github.com/jphein/realm-sigil/go"
```

After the `/api/health` handler at line 165, add:
```go
mux.HandleFunc("/api/version", sigil.Handler(
    "oracle", "Voice-first AI oracle with fantasy UI", "oracle",
    "https://github.com/jphein/oracle"))
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /home/jp/Projects/oracle && make build`
Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
cd /home/jp/Projects/oracle
git add go.mod go.sum main.go Makefile
git commit -m "feat: add realm-sigil /api/version endpoint (oracle realm)"
```

---

### Task 4: Integrate realm-sigil into realmcoin (Go — has VERSION var, no ldflags)

realmcoin at `/home/jp/Projects/realmcoin/` has a VERSION var in Makefile but doesn't use ldflags. Routes at `main.go:57-76`.

**Files:**
- Modify: `/home/jp/Projects/realmcoin/go.mod` (add realm-sigil)
- Modify: `/home/jp/Projects/realmcoin/main.go:57-76` (add /api/version route)
- Modify: `/home/jp/Projects/realmcoin/Makefile:6,14` (add ldflags to build)

- [ ] **Step 1: Add realm-sigil dependency to go.mod**

Add to `/home/jp/Projects/realmcoin/go.mod`:
```
require github.com/jphein/realm-sigil/go v0.0.0

replace github.com/jphein/realm-sigil/go => /home/jp/Projects/realm-sigil/go
```

- [ ] **Step 2: Update Makefile with ldflags**

Current line 6:
```makefile
VERSION     := $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)
```
Current line 14:
```makefile
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GO) build -o $(BINARY)
```

Add after VERSION line:
```makefile
BRANCH     := $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
DIRTY      := $(shell git diff --quiet 2>/dev/null && echo false || echo true)
BUILD_TIME := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
SIGIL      := github.com/jphein/realm-sigil/go
```

Update build line to:
```makefile
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GO) build -ldflags "-X '$(SIGIL).Hash=$(VERSION)' -X '$(SIGIL).Branch=$(BRANCH)' -X '$(SIGIL).Dirty=$(DIRTY)' -X '$(SIGIL).Built=$(BUILD_TIME)'" -o $(BINARY)
```

- [ ] **Step 3: Add /api/version route**

Add import:
```go
sigil "github.com/jphein/realm-sigil/go"
```

After the existing route registrations (around line 76), add:
```go
mux.HandleFunc("/api/version", sigil.Handler(
    "realmcoin", "Fantasy homelab coin with YNAB integration", "fantasy",
    "https://github.com/jphein/realmcoin"))
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /home/jp/Projects/realmcoin && make build`
Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
cd /home/jp/Projects/realmcoin
git add go.mod go.sum main.go Makefile
git commit -m "feat: add realm-sigil /api/version endpoint (fantasy realm)"
```

---

### Task 5: Integrate realm-sigil into realmwatch (Python)

realmwatch at `/home/jp/Projects/realmwatch/` uses a Python HTTP server with route_table pattern. Routes registered in `map_server.py:1427-1459`.

**Files:**
- Modify: `/home/jp/Projects/realmwatch/map_server.py` (add /api/version route + handler)

- [ ] **Step 1: Add version handler import and function**

At the top of `/home/jp/Projects/realmwatch/map_server.py`, add the import (near other imports):
```python
import sys, platform, socket, time as _time
```

Then add the handler function (near the other `_h_*` handler functions, before route registration):
```python
def _h_get_api_version(env, respond):
    """Serve /api/version using realm-sigil contract."""
    import subprocess, json, os
    project_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Git info
    try:
        hash_ = subprocess.run(["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, cwd=project_dir).stdout.strip() or "dev"
        branch = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, cwd=project_dir).stdout.strip() or "unknown"
        dirty = subprocess.run(["git", "diff", "--quiet"],
            capture_output=True, cwd=project_dir).returncode != 0
    except:
        hash_, branch, dirty = "dev", "unknown", False

    # Realm-sigil name generation (inline — avoids cross-project import)
    sys.path.insert(0, os.path.expanduser("~/Projects/realm-sigil/python"))
    from realm_sigil import generate_name
    sys.path.pop(0)

    version = {
        "name": "realmwatch",
        "description": "Fantasy homelab network monitor",
        "version": generate_name(hash_, "fantasy"),
        "hash": hash_,
        "branch": branch,
        "dirty": dirty,
        "built": _server_start_iso,
        "started": _server_start_iso,
        "uptime": int(_time.time() - _server_start_time),
        "realm": "fantasy",
        "runtime": f"python{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "os": f"{sys.platform}/{platform.machine()}",
        "host": socket.gethostname(),
        "pid": os.getpid(),
        "repo": "https://github.com/jphein/realmwatch",
        "commit_url": f"https://github.com/jphein/realmwatch/commit/{hash_}" if hash_ != "dev" else "",
    }

    body = json.dumps(version, indent=2).encode()
    respond("200 OK", [("Content-Type", "application/json"),
                        ("Cache-Control", "no-cache"),
                        ("Access-Control-Allow-Origin", "*")])
    return [body]
```

Note: `_server_start_time` and `_server_start_iso` need to be defined near the top of the file:
```python
_server_start_time = _time.time()
_server_start_iso = _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime())
```

- [ ] **Step 2: Register the route**

In the route registration block at line ~1459, add:
```python
_route_table.add("GET", "/api/version", _h_get_api_version)
```

- [ ] **Step 3: Test locally**

Run: `cd /home/jp/Projects/realmwatch && python3 -c "
import sys; sys.path.insert(0, '.'); 
from map_server import _h_get_api_version
print('Handler defined OK')
"`
Expected: No import errors.

- [ ] **Step 4: Commit**

```bash
cd /home/jp/Projects/realmwatch
git add map_server.py
git commit -m "feat: add realm-sigil /api/version endpoint (fantasy realm)"
```

---

### Task 6: Integrate realm-sigil into techempower (Next.js)

techempower at `/home/jp/Projects/techempower/` uses Next.js with API routes in `pages/api/`. Existing API files: `resources-more.ts`, `search-notion.ts`, `social-image.tsx`.

**Files:**
- Create: `/home/jp/Projects/techempower/pages/api/version.ts`

- [ ] **Step 1: Create the API route**

Create `/home/jp/Projects/techempower/pages/api/version.ts`:
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { execFileSync } from 'child_process';
import os from 'os';

const startTime = Date.now();
const startISO = new Date().toISOString();

// Realm-sigil word lists (forge realm)
const adjectives = [
  "Annealed", "Bolted", "Carbonized", "Dense", "Electric",
  "Flux", "Galvanized", "Hardened", "Ignited", "Joined",
  "Keen", "Laminated", "Molten", "Nitrided", "Oxidized",
  "Pressed", "Quenched", "Riveted", "Sintered", "Tempered"
];
const nouns = [
  "Anvil", "Bellows", "Crucible", "Die", "Engine",
  "Furnace", "Gear", "Hammer", "Ingot", "Jig",
  "Kiln", "Lathe", "Mandrel", "Nozzle", "Oven",
  "Piston", "Quench", "Rivet", "Spark", "Tongs"
];

function generateName(hash: string): string {
  const seed = parseInt(hash, 16) || 0;
  const adj = adjectives[seed % adjectives.length];
  const noun = nouns[(seed >> 8) % nouns.length];
  return `${adj} ${noun} · ${hash}`;
}

function gitInfo() {
  const info = { hash: 'dev', branch: 'unknown', dirty: false };
  try {
    info.hash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() || 'dev';
    info.branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim() || 'unknown';
    try { execFileSync('git', ['diff', '--quiet']); } catch { info.dirty = true; }
  } catch {}
  return info;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const git = gitInfo();
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    name: 'techempower',
    description: 'Tech empower platform',
    version: generateName(git.hash),
    hash: git.hash,
    branch: git.branch,
    dirty: git.dirty,
    built: startISO,
    started: startISO,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    realm: 'forge',
    runtime: `node${process.version}`,
    os: `${process.platform}/${process.arch}`,
    host: os.hostname(),
    pid: process.pid,
    repo: 'https://github.com/jphein/techempower',
    commit_url: git.hash !== 'dev' ? `https://github.com/jphein/techempower/commit/${git.hash}` : '',
  });
}
```

Note: Word lists are inlined rather than importing from realm-sigil to avoid cross-project import issues in Vercel deployment. The values match `words/realms.json` forge realm exactly.

- [ ] **Step 2: Test locally**

Run: `cd /home/jp/Projects/techempower && npx next build`
Expected: Builds without errors.

- [ ] **Step 3: Commit**

```bash
cd /home/jp/Projects/techempower
git add pages/api/version.ts
git commit -m "feat: add realm-sigil /api/version endpoint (forge realm)"
```

---

### Task 7: Integrate realm-sigil into artcardsv5 (Vercel)

artcardsv5 at `/home/jp/Projects/artcardsv5/` uses Vercel serverless functions in `api/`. Existing: `api/gamecrafter/`, `api/generate/`.

**Files:**
- Create: `/home/jp/Projects/artcardsv5/api/version.js`

- [ ] **Step 1: Create the Vercel function**

Create `/home/jp/Projects/artcardsv5/api/version.js`:
```javascript
// Realm-sigil word lists (tarot realm)
const adjectives = [
  "Arcane", "Blessed", "Charmed", "Destined", "Enchanted",
  "Fateful", "Guiding", "Hidden", "Illumined", "Judging",
  "Karmic", "Liminal", "Moonlit", "Numbered", "Ordained",
  "Portentous", "Querent", "Reversed", "Starlit", "Turning"
];
const nouns = [
  "Amulet", "Blade", "Chalice", "Diviner", "Emperor",
  "Fool", "Guardian", "Hermit", "Initiate", "Justice",
  "Knight", "Lovers", "Magician", "Nomad", "Ouroboros",
  "Pentacle", "Querent", "Rosette", "Scepter", "Tower"
];

function generateName(hash) {
  const seed = parseInt(hash, 16) || 0;
  const adj = adjectives[seed % adjectives.length];
  const noun = nouns[(seed >> 8) % nouns.length];
  return `${adj} ${noun} · ${hash}`;
}

const { execFileSync } = require('child_process');
const os = require('os');

const startTime = Date.now();
const startISO = new Date().toISOString();

function gitInfo() {
  const info = { hash: 'dev', branch: 'unknown', dirty: false };
  try {
    info.hash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() || 'dev';
    info.branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim() || 'unknown';
    try { execFileSync('git', ['diff', '--quiet']); } catch (e) { info.dirty = true; }
  } catch (e) {}
  return info;
}

module.exports = (req, res) => {
  const git = gitInfo();
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    name: 'artcardsv5',
    description: 'Imaginal art card creator',
    version: generateName(git.hash),
    hash: git.hash,
    branch: git.branch,
    dirty: git.dirty,
    built: startISO,
    started: startISO,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    realm: 'tarot',
    runtime: `node${process.version}`,
    os: `${process.platform}/${process.arch}`,
    host: os.hostname(),
    pid: process.pid,
    repo: 'https://github.com/jphein/artcardsv5',
    commit_url: git.hash !== 'dev' ? `https://github.com/jphein/artcardsv5/commit/${git.hash}` : '',
  });
};
```

- [ ] **Step 2: Test locally**

Run: `cd /home/jp/Projects/artcardsv5 && node -e "const h = require('./api/version'); console.log('Handler loaded OK')"`
Expected: "Handler loaded OK"

- [ ] **Step 3: Commit**

```bash
cd /home/jp/Projects/artcardsv5
git add api/version.js
git commit -m "feat: add realm-sigil /api/version endpoint (tarot realm)"
```

---

### Task 8: Add version.json to opus (static site)

opus at `/home/jp/Projects/opus/` is a static HTML site on GitHub Pages. Use the static builder to generate `version.json` and inject the meta tag.

**Files:**
- Create: `/home/jp/Projects/opus/version.json` (generated by build.sh)
- Modify: `/home/jp/Projects/opus/index.html` (meta tag injected by build.sh)

- [ ] **Step 1: Run the static builder**

```bash
cd /home/jp/Projects/opus
~/Projects/realm-sigil/static/build.sh \
    --name opus \
    --description "Claude Opus 4.6 info page" \
    --realm stellar \
    --repo https://github.com/jphein/opus \
    --html index.html
```

Expected: "✓ version.json written" and "✓ Injected meta tag into index.html"

- [ ] **Step 2: Verify version.json**

```bash
cat /home/jp/Projects/opus/version.json
```
Expected: JSON with name "opus", realm "stellar", a stellar-themed version name.

- [ ] **Step 3: Verify meta tag in index.html**

```bash
grep 'realm-version' /home/jp/Projects/opus/index.html
```
Expected: `<meta name="realm-version" content='...'>`

- [ ] **Step 4: Commit**

```bash
cd /home/jp/Projects/opus
git add version.json index.html
git commit -m "feat: add realm-sigil version.json + meta tag (stellar realm)"
```

---

### Task 9: Add version probing to check.sh

Add a version check loop to the openclaw status page monitoring script at `/home/jp/Projects/openclaw/statuspage/check.sh`. This reads the `version` array from `checks.json` and fetches each URL.

**Files:**
- Modify: `/home/jp/Projects/openclaw/statuspage/check.sh` (add version probe section inside the Python block)

- [ ] **Step 1: Add version config to checks.json**

Add a `"version"` key to `/home/jp/Projects/openclaw/statuspage/checks.json`:
```json
"version": [
  {"name": "Dreamscape", "url": "https://dreamscape.imaginalvision.com/api/version"},
  {"name": "Art Cards", "url": "https://artcards.imaginalvision.com/api/version"},
  {"name": "Art Cards (Vercel)", "url": "https://artcardsv5.vercel.app/api/version"},
  {"name": "TechEmpower", "url": "https://techempower.vercel.app/api/version"},
  {"name": "Opus", "url": "https://jphein.github.io/opus/version.json"}
]
```

Note: Local services (realm-portal, realmwatch, realmcoin, oracle) will be added once Tailscale ACLs allow HTTP access. For now, include only publicly reachable endpoints.

- [ ] **Step 2: Add version probing to the Python block in check.sh**

In `/home/jp/Projects/openclaw/statuspage/check.sh`, inside the Python heredoc (after the game server version section, before the final JSON output assembly), add:

```python
# Version endpoint checks
versions = []
for v in config.get("version", []):
    try:
        req = urllib.request.Request(v["url"], headers={"User-Agent": "openclaw-check/1.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode())
        versions.append({
            "name": v["name"],
            "url": v["url"],
            "status": "up",
            "data": data,
            "ts": ts,
        })
    except Exception as e:
        versions.append({
            "name": v["name"],
            "url": v["url"],
            "status": "down",
            "error": str(e),
            "ts": ts,
        })
```

- [ ] **Step 3: Include versions in status.json output**

In the final JSON assembly section of check.sh (where it writes status.json), add `"versions"` to the output:

Find the line that assembles the final JSON object and add:
```python
"versions": versions,
```

alongside the existing `"checks"`, `"game_servers"`, `"agent"`, etc.

- [ ] **Step 4: Test check.sh locally**

```bash
cd /home/jp/Projects/openclaw/statuspage && bash check.sh && python3 -c "
import json
with open('status.json') as f:
    d = json.load(f)
v = d.get('versions', [])
print(f'{len(v)} version endpoints checked')
for e in v:
    print(f'  {e[\"name\"]}: {e[\"status\"]}')
"
```

- [ ] **Step 5: Commit**

```bash
cd /home/jp/Projects/openclaw
git add statuspage/check.sh statuspage/checks.json
git commit -m "feat: add version endpoint probing to status page"
```

---

### Task 10: Add Service Versions section to status page dashboard

Add a new "Service Versions" section to the status page at `/home/jp/Projects/openclaw/statuspage/index.html` that renders version cards with realm-colored accents.

**Files:**
- Modify: `/home/jp/Projects/openclaw/statuspage/index.html` (add CSS + render logic)

- [ ] **Step 1: Add realm color CSS variables**

In the `<style>` block (after the existing `--accent` variable around line 18), add:
```css
  --realm-fantasy: #3fb950;
  --realm-tarot: #a371f7;
  --realm-oracle: #d2a8ff;
  --realm-void: #8b949e;
  --realm-forge: #f0883e;
  --realm-signal: #58a6ff;
  --realm-stellar: #f778ba;
```

Also add in the light theme block:
```css
  --realm-fantasy: #1a7f37;
  --realm-tarot: #8250df;
  --realm-oracle: #6639ba;
  --realm-void: #656d76;
  --realm-forge: #bc4c00;
  --realm-signal: #0969da;
  --realm-stellar: #bf3989;
```

- [ ] **Step 2: Add version card CSS**

After the existing game server CSS (around line 140), add:
```css
.version-card { padding: 0.7rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.version-card:last-child { border-bottom: none; }
.version-info { flex: 1; }
.version-name-line { display: flex; align-items: center; gap: 0.5rem; font-weight: 500; }
.version-sigil { font-family: 'Georgia', serif; font-style: italic; color: var(--text); }
.version-hash { font-family: monospace; font-size: 0.8rem; color: var(--text-muted); text-decoration: none; }
.version-hash:hover { text-decoration: underline; }
.version-detail { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; }
.version-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
.version-uptime { font-size: 0.8rem; color: var(--text-muted); }
.realm-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.version-branch { font-family: monospace; font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 4px; background: color-mix(in srgb, var(--text-muted) 15%, var(--surface)); }
.version-dirty { color: var(--down); font-size: 0.75rem; font-weight: 600; }
```

- [ ] **Step 3: Add version section render function**

In the `<script>` block, add this function before the `render()` function:
```javascript
function realmColor(realm) {
  return 'var(--realm-' + (realm || 'fantasy') + ')';
}

function createVersionCard(v) {
  var card = el('div', 'version-card');
  var info = el('div', 'version-info');

  // Name line: realm dot + sigil name
  var nameLine = el('div', 'version-name-line');
  var dot = document.createElement('span');
  dot.className = 'realm-dot';
  dot.style.background = realmColor(v.data.realm);
  nameLine.appendChild(dot);
  nameLine.appendChild(el('span', 'version-sigil', v.data.version));
  info.appendChild(nameLine);

  // Detail line: description · branch · runtime
  var parts = [v.data.description];
  if (v.data.branch) parts.push(v.data.branch);
  if (v.data.runtime) parts.push(v.data.runtime);
  info.appendChild(el('div', 'version-detail', parts.join(' · ')));
  card.appendChild(info);

  // Meta: hash link + uptime + dirty warning
  var meta = el('div', 'version-meta');
  if (v.data.commit_url) {
    var a = document.createElement('a');
    a.href = v.data.commit_url;
    a.target = '_blank';
    a.className = 'version-hash';
    a.textContent = v.data.hash;
    meta.appendChild(a);
  } else {
    meta.appendChild(el('span', 'version-hash', v.data.hash));
  }
  if (v.data.uptime !== undefined) {
    meta.appendChild(el('span', 'version-uptime', formatUptime(v.data.uptime)));
  }
  if (v.data.dirty) {
    meta.appendChild(el('span', 'version-dirty', 'dirty'));
  }
  card.appendChild(meta);
  return card;
}
```

- [ ] **Step 4: Add versions rendering to the render() function**

In the `render(data)` function, after the "Public Services" section (around line 273) and before the "Game Servers" section, add:

```javascript
  // Service Versions
  var versions = (data.versions || []).filter(function(v) { return v.status === 'up' && v.data; });
  if (versions.length > 0) {
    var verSection = el('div', 'section');
    verSection.appendChild(el('div', 'section-title', 'Service Versions'));
    var verCard = el('div', 'card');
    versions.forEach(function(v) { verCard.appendChild(createVersionCard(v)); });
    verSection.appendChild(verCard);
    app.appendChild(verSection);
  }

  // Unreachable version endpoints
  var verDown = (data.versions || []).filter(function(v) { return v.status === 'down'; });
  if (verDown.length > 0) {
    var verDownSection = el('div', 'section');
    verDownSection.appendChild(el('div', 'section-title', 'Version Endpoints (unreachable)'));
    var verDownCard = el('div', 'card');
    verDown.forEach(function(v) {
      verDownCard.appendChild(createCheckRow(v.name, v.url, 'down'));
    });
    verDownSection.appendChild(verDownCard);
    app.appendChild(verDownSection);
  }
```

- [ ] **Step 5: Test with mock data**

Open the status page in a browser and verify the versions section renders. If no version endpoints are reachable yet, temporarily add test data to status.json:
```json
"versions": [{"name": "Test", "url": "http://test", "status": "up", "data": {"name": "test", "description": "Test service", "version": "Arcane Crown · abc1234", "hash": "abc1234", "branch": "main", "dirty": false, "realm": "fantasy", "uptime": 3600, "commit_url": "https://github.com/jphein/test/commit/abc1234"}}]
```

- [ ] **Step 6: Commit**

```bash
cd /home/jp/Projects/openclaw
git add statuspage/index.html
git commit -m "feat: add Service Versions section to status page dashboard"
```

---

### Task 11: Add Version Endpoints section to config editor

Add a "Version Endpoints" section to the config editor at `/home/jp/Projects/openclaw/statuspage/edit.html` with name + URL fields and drag-and-drop support.

**Files:**
- Modify: `/home/jp/Projects/openclaw/statuspage/edit.html` (add version section in renderEditor)

- [ ] **Step 1: Add version section to renderEditor()**

In `/home/jp/Projects/openclaw/statuspage/edit.html`, find the `renderEditor()` function. After the last `renderSection()` or `renderStringList()` call, add:

```javascript
  renderSection(editor, 'Version Endpoints', 'version', config.version || [],
    [{key: 'name', cls: 'field-name', ph: 'Name'},
     {key: 'url', cls: 'field-host', ph: 'URL (e.g. https://example.com/api/version)'}]);
```

- [ ] **Step 2: Ensure getArray/setArray handle the version key**

Check if `getArray()` and `setArray()` in edit.html handle top-level keys generically. If they do (i.e., `config[key]`), no changes needed. If they have hardcoded key handling, add `"version"` to the supported keys.

- [ ] **Step 3: Ensure add button template for version**

In the `renderSection` function's add button handler, check that a new item for the "version" key creates the right template. If it uses a generic `{}` template, verify the fields match. The add handler should create:
```javascript
{name: '', url: ''}
```

- [ ] **Step 4: Test in browser**

Open `/edit.html`, verify a "Version Endpoints" section appears with name + URL fields. Test add, delete, and drag-and-drop reorder. Save and verify `checks.json` includes the `version` array.

- [ ] **Step 5: Commit**

```bash
cd /home/jp/Projects/openclaw
git add statuspage/edit.html
git commit -m "feat: add Version Endpoints section to config editor"
```

---

### Task 12: Deploy and verify

Deploy the updated status page to the openclaw server and verify version endpoints are working end-to-end.

**Files:**
- Run: `/home/jp/Projects/openclaw/deploy.sh`

- [ ] **Step 1: Deploy openclaw status page**

```bash
cd /home/jp/Projects/openclaw && ./deploy.sh
```

- [ ] **Step 2: Verify version endpoints on public services**

```bash
curl -s https://dreamscape.imaginalvision.com/api/version | python3 -m json.tool
curl -s https://artcards.imaginalvision.com/api/version | python3 -m json.tool
curl -s https://artcardsv5.vercel.app/api/version | python3 -m json.tool
curl -s https://techempower.vercel.app/api/version | python3 -m json.tool
curl -s https://jphein.github.io/opus/version.json | python3 -m json.tool
```

Expected: Each returns the standardized JSON contract with appropriate realm-themed name.

- [ ] **Step 3: Trigger a status check**

```bash
ssh openclaw 'cd ~/statuspage && bash check.sh'
```

- [ ] **Step 4: Verify status.json includes versions**

```bash
ssh openclaw 'python3 -c "import json; d=json.load(open(\"statuspage/status.json\")); print(json.dumps(d.get(\"versions\",[]), indent=2))"'
```

Expected: Array of version results with status "up" and full data objects.

- [ ] **Step 5: View the dashboard**

Open `http://100.69.161.127:8080/` in browser and verify the "Service Versions" section shows cards with realm-colored dots, magical names, hash links, and uptime.

- [ ] **Step 6: Final commit for any deploy fixes**

```bash
cd /home/jp/Projects/openclaw
git add -u
git commit -m "fix: deploy adjustments for version integration"
```
