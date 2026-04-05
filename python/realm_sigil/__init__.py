"""realm-sigil: Deterministic magical version name generation."""

__version__ = "1.0.0"

from .realms import REALMS


def generate_name(hash: str, realm: str = "fantasy") -> str:
    """Generate a deterministic magical name from a git hash and realm.

    Same hash + realm always produces the same name.
    """
    r = REALMS.get(realm, REALMS["fantasy"])
    seed = int(hash, 16) if hash != "dev" else 0

    adj = r["adjectives"][seed % len(r["adjectives"])]
    noun = r["nouns"][(seed >> 8) % len(r["nouns"])]

    return f"{adj} {noun} · {hash}"


def version_dict(
    name: str,
    description: str,
    realm: str,
    repo: str,
    *,
    hash: str = "dev",
    branch: str = "unknown",
    dirty: bool = False,
    built: str = "unknown",
    started: str | None = None,
    uptime: int | None = None,
    runtime: str | None = None,
    os_info: str | None = None,
    host: str | None = None,
    pid: int | None = None,
) -> dict:
    """Build a version response dict conforming to the realm-sigil contract."""
    commit_url = f"{repo}/commit/{hash}" if repo and hash != "dev" else ""

    d = {
        "name": name,
        "description": description,
        "version": generate_name(hash, realm),
        "hash": hash,
        "branch": branch,
        "dirty": dirty,
        "built": built,
        "realm": realm,
        "repo": repo,
        "commit_url": commit_url,
    }

    # Optional server-only fields
    if started is not None:
        d["started"] = started
    if uptime is not None:
        d["uptime"] = uptime
    if runtime is not None:
        d["runtime"] = runtime
    if os_info is not None:
        d["os"] = os_info
    if host is not None:
        d["host"] = host
    if pid is not None:
        d["pid"] = pid

    return d
