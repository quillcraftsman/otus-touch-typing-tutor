#!/usr/bin/env python3
"""Deploy touch-typing-tutor to VPS via SSH (reads credentials from .env)."""

from __future__ import annotations

import io
import os
import secrets
import sys
import tarfile
import textwrap
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
REMOTE_DIR = "/opt/touch-typing-tutor"
APP_NAME = "touch-typing-tutor"


def load_env(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        data[key.strip()] = value
    return data


def run(client: paramiko.SSHClient, command: str, check: bool = True) -> tuple[int, str, str]:
    print(f"\n$ {command}")
    _, stdout, stderr = client.exec_command(command, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out.rstrip())
    if err:
        print(err.rstrip(), file=sys.stderr)
    if check and code != 0:
        raise RuntimeError(f"Command failed ({code}): {command}")
    return code, out, err


def make_tarball() -> bytes:
    exclude_dirs = {
        "node_modules",
        ".next",
        "coverage",
        ".git",
        "notes",
    }
    exclude_names = {".env"}

    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for path in ROOT.rglob("*"):
            rel = path.relative_to(ROOT)
            parts = rel.parts
            if parts and parts[0] in exclude_dirs:
                continue
            if any(part in exclude_dirs for part in parts):
                continue
            if path.name in exclude_names:
                continue
            if path.is_file():
                tar.add(path, arcname=str(rel).replace("\\", "/"))
    buf.seek(0)
    return buf.read()


def main() -> int:
    env_path = ROOT / ".env"
    if not env_path.exists():
        print("Missing .env", file=sys.stderr)
        return 1

    env = load_env(env_path)
    host = env.get("SSH_IP")
    user = env.get("SSH_USER", "root")
    password = env.get("SSH_PASSWORD")
    port = int(env.get("SSH_PORT", "22"))
    deploy_port = env.get("DEPLOY_PORT", "8671")
    admin_email = env.get("ADMIN_EMAIL", "admin@example.com")

    if not host or not password:
        print("SSH_IP and SSH_PASSWORD required in .env", file=sys.stderr)
        return 1

    auth_url = f"http://{host}:{deploy_port}"
    auth_secret = secrets.token_urlsafe(32)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {user}@{host}:{port}...")
    client.connect(
        hostname=host,
        port=port,
        username=user,
        password=password,
        timeout=60,
        allow_agent=False,
        look_for_keys=False,
    )

    print("=== Server audit ===")
    run(client, "set -e; uname -a; lsb_release -a 2>/dev/null || cat /etc/os-release")
    run(client, "df -h / /var/lib/docker 2>/dev/null || df -h /")
    run(client, "free -h || true")
    run(client, "docker --version")
    run(client, "docker compose version || docker-compose --version")
    run(client, f"ss -tlnp | grep -E ':{deploy_port}\\b' || true", check=False)
    run(client, "docker ps --format 'table {{.Names}}\\t{{.Ports}}\\t{{.Status}}'")

    run(client, f"mkdir -p {REMOTE_DIR}")

    print("=== Uploading application archive ===")
    tarball = make_tarball()
    sftp = client.open_sftp()
    remote_tar = f"{REMOTE_DIR}/app.tgz"
    with sftp.file(remote_tar, "wb") as f:
        f.write(tarball)
    sftp.close()

    prod_env = textwrap.dedent(
        f"""\
        DEPLOY_PORT={deploy_port}
        AUTH_SECRET={auth_secret}
        ADMIN_EMAIL={admin_email}
        AUTH_URL={auth_url}
        INVESTOR_CONTACT_EMAIL={env.get('INVESTOR_CONTACT_EMAIL', 'investors@example.com')}
        """
    )

    run(
        client,
        f"set -e; cd {REMOTE_DIR}; rm -rf app; mkdir -p app; tar -xzf app.tgz -C app; rm app.tgz",
    )
    run(
        client,
        f"cat > {REMOTE_DIR}/app/.env.production << 'EOF'\n{prod_env}EOF",
    )

    print("=== Building and starting container (isolated port) ===")
    run(
        client,
        f"set -e; cd {REMOTE_DIR}/app; "
        f"docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache",
    )
    run(
        client,
        f"set -e; cd {REMOTE_DIR}/app; "
        "docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans",
    )

    run(client, "docker ps --filter name=touch-typing-tutor --format 'table {{.Names}}\\t{{.Ports}}\\t{{.Status}}'")
    run(client, f"curl -sf -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{deploy_port}/ || true", check=False)

    client.close()
    print(f"\nDeploy complete: {auth_url}")
    print("Admin login uses ADMIN_EMAIL from .env.production on server (register first if no user).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
