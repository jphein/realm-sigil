"""HTTP handler helpers for Python web servers."""

import json
import os
import platform
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone

from . import generate_name, version_dict

_start_time = time.time()
_start_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _git_info(project_dir: str | None = None) -> dict:
    """Gather git info from the working directory."""
    cwd = project_dir or os.getcwd()
    info = {"hash": "dev", "branch": "unknown", "dirty": False}

    try:
        info["hash"] = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, cwd=cwd
        ).stdout.strip() or "dev"

        info["branch"] = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, cwd=cwd
        ).stdout.strip() or "unknown"

        result = subprocess.run(
            ["git", "diff", "--quiet"],
            capture_output=True, cwd=cwd
        )
        info["dirty"] = result.returncode != 0
    except FileNotFoundError:
        pass

    return info


def make_version_response(
    name: str,
    description: str,
    realm: str,
    repo: str,
    project_dir: str | None = None,
) -> dict:
    """Build a complete version response with live system info."""
    git = _git_info(project_dir)

    return version_dict(
        name=name,
        description=description,
        realm=realm,
        repo=repo,
        hash=git["hash"],
        branch=git["branch"],
        dirty=git["dirty"],
        built=_start_iso,  # For Python, built ≈ started (no compilation)
        started=_start_iso,
        uptime=int(time.time() - _start_time),
        runtime=f"python{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        os_info=f"{sys.platform}/{platform.machine()}",
        host=socket.gethostname(),
        pid=os.getpid(),
    )


def version_handler(
    name: str,
    description: str,
    realm: str,
    repo: str,
    project_dir: str | None = None,
):
    """Return a handler function suitable for Python HTTP servers.

    Works with http.server.BaseHTTPRequestHandler-style servers.
    Returns a callable that produces (status_code, headers, body_bytes).
    """
    def handle():
        body = json.dumps(
            make_version_response(name, description, realm, repo, project_dir),
            indent=2,
        ).encode()
        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
        }
        return 200, headers, body

    return handle
