/**
 * HTTP handler helpers for Node.js servers (Express, Next.js, Vercel).
 */

const { execFileSync } = require('child_process');
const os = require('os');
const { versionObject } = require('./index');

const startTime = Date.now();
const startISO = new Date().toISOString();

function gitInfo(cwd) {
  const info = { hash: 'dev', branch: 'unknown', dirty: false };
  try {
    info.hash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf8' }).trim() || 'dev';
    info.branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8' }).trim() || 'unknown';
    try {
      execFileSync('git', ['diff', '--quiet'], { cwd });
      info.dirty = false;
    } catch {
      info.dirty = true;
    }
  } catch {
    // git not available
  }
  return info;
}

/**
 * Build a complete version response with live system info.
 */
function makeVersionResponse(name, description, realm, repo, cwd) {
  const git = gitInfo(cwd);
  return versionObject({
    name,
    description,
    realm,
    repo,
    hash: git.hash,
    branch: git.branch,
    dirty: git.dirty,
    built: startISO,
    started: startISO,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    runtime: `node${process.version}`,
    os: `${process.platform}/${process.arch}`,
    host: os.hostname(),
    pid: process.pid,
  });
}

/**
 * Next.js API route handler.
 * Usage: export default nextHandler('myapp', 'My app', 'forge', 'https://github.com/jphein/myapp')
 */
function nextHandler(name, description, realm, repo, cwd) {
  return (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(makeVersionResponse(name, description, realm, repo, cwd));
  };
}

/**
 * Vercel serverless handler.
 * Usage: export default vercelHandler('myapp', 'My app', 'tarot', 'https://github.com/jphein/myapp')
 */
function vercelHandler(name, description, realm, repo, cwd) {
  return (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(makeVersionResponse(name, description, realm, repo, cwd));
  };
}

/**
 * Express middleware.
 * Usage: app.get('/api/version', expressHandler('myapp', 'My app', 'forge', 'https://...'))
 */
function expressHandler(name, description, realm, repo, cwd) {
  return (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.set('Access-Control-Allow-Origin', '*');
    res.json(makeVersionResponse(name, description, realm, repo, cwd));
  };
}

module.exports = { makeVersionResponse, nextHandler, vercelHandler, expressHandler, gitInfo };
