import paramiko
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
env = {}
for line in (ROOT / ".env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("connecting...", flush=True)
c.connect(
    env["SSH_IP"],
    int(env.get("SSH_PORT", "22")),
    env["SSH_USER"],
    env["SSH_PASSWORD"],
    timeout=60,
    banner_timeout=120,
    auth_timeout=120,
    allow_agent=False,
    look_for_keys=False,
)
print("connected", flush=True)
_, stdout, _ = c.exec_command("uname -a; df -h /; docker ps --format '{{.Names}}'")
print(stdout.read().decode(), flush=True)
c.close()
