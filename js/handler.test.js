// realm-sigil JS — handler.js tests.
// Run with: bun test handler.test.js  (or node --test if Bun isn't available)
//
// Covers the .git_info file fallback, runtime label detection, and the
// new bunHandler that returns a fetch-API Response. The framework
// handlers (next/vercel/express) are thin wrappers over makeVersionResponse;
// we test the underlying pure path rather than mocking three frameworks.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('bun:test');

const { gitInfo, makeVersionResponse, bunHandler } = require('./handler');
const { generateName } = require('./index');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sigil-test-'));
}

test('gitInfo prefers .git_info file over live git', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, '.git_info'),
    JSON.stringify({ hash: 'baked123', branch: 'feat/x', dirty: true }));
  const info = gitInfo(dir);
  expect(info.hash).toBe('baked123');
  expect(info.branch).toBe('feat/x');
  expect(info.dirty).toBe(true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('gitInfo treats malformed .git_info as missing (live git fallback path)', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, '.git_info'), 'not json');
  const info = gitInfo(dir);
  // Live git fallback in a non-repo dir → all defaults.
  expect(info.hash).toBe('dev');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('makeVersionResponse generates the canonical version field shape', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, '.git_info'),
    JSON.stringify({ hash: 'e4f5a6b', branch: 'main', dirty: false }));
  const v = makeVersionResponse('myapp', 'My App', 'fantasy', 'https://github.com/x/y', dir);
  // Canonical contract: version is the magical name.
  expect(v.version).toBe(generateName('e4f5a6b', 'fantasy'));
  expect(v.name).toBe('myapp');
  expect(v.description).toBe('My App');
  expect(v.realm).toBe('fantasy');
  expect(v.hash).toBe('e4f5a6b');
  expect(v.branch).toBe('main');
  expect(v.dirty).toBe(false);
  expect(v.commit_url).toBe('https://github.com/x/y/commit/e4f5a6b');
  // Runtime fields filled in:
  expect(typeof v.started).toBe('string');
  expect(typeof v.uptime).toBe('number');
  expect(typeof v.runtime).toBe('string');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('bunHandler returns a Response with JSON body', async () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, '.git_info'),
    JSON.stringify({ hash: 'bun1234', branch: 'main', dirty: false }));
  const handler = bunHandler('myapp', 'My App', 'fantasy', 'https://x/y', dir);
  const req = new Request('http://localhost/api/version');
  const res = handler(req);
  expect(res).toBeInstanceOf(Response);
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('application/json');
  expect(res.headers.get('cache-control')).toBe('no-cache');
  expect(res.headers.get('access-control-allow-origin')).toBe('*');
  const body = await res.json();
  expect(body.hash).toBe('bun1234');
  expect(body.version).toBe(generateName('bun1234', 'fantasy'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('bunHandler is deterministic — same hash + realm = same name', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, '.git_info'),
    JSON.stringify({ hash: 'aaaa1111', branch: 'main', dirty: false }));
  const handler = bunHandler('a', 'a', 'fantasy', null, dir);
  const a = handler(new Request('http://x/'));
  const b = handler(new Request('http://x/'));
  // Different Response instances, but same logical content.
  return Promise.all([a.json(), b.json()]).then(([x, y]) => {
    expect(x.version).toBe(y.version);
  }).finally(() => fs.rmSync(dir, { recursive: true, force: true }));
});
