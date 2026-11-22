import { execSync } from "node:child_process";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "ssh2";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REMOTE_DIR = "/opt/touch-typing-tutor";

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function exec(conn, command, { check = true } = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n$ ${command}`);
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream
        .on("close", (code) => {
          if (check && code !== 0) {
            reject(new Error(`Command failed (${code}): ${command}\n${out}`));
            return;
          }
          resolve({ code, out });
        })
        .on("data", (data) => {
          const text = data.toString();
          out += text;
          process.stdout.write(text);
        })
        .stderr.on("data", (data) => process.stderr.write(data.toString()));
    });
  });
}

function connect(config) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", reject)
      .connect({
        host: config.host,
        port: config.port,
        username: config.user,
        password: config.password,
        readyTimeout: 120000,
      });
  });
}

function upload(conn, localPath, remotePath) {
  const size = statSync(localPath).size;
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const readStream = createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);
      pipeline(readStream, writeStream)
        .then(() => resolve(size))
        .catch(reject);
    });
  });
}

const ENSURE_SWAP = `
if ! swapon --show | grep -q '/swapfile-ttt'; then
  if [ ! -f /swapfile-ttt ]; then
    fallocate -l 2G /swapfile-ttt 2>/dev/null || dd if=/dev/zero of=/swapfile-ttt bs=1M count=2048 status=progress
    chmod 600 /swapfile-ttt
    mkswap /swapfile-ttt
  fi
  swapon /swapfile-ttt 2>/dev/null || true
fi
swapon --show || true
free -h
`;

async function main() {
  const env = loadEnv(join(ROOT, ".env"));
  const host = env.SSH_IP;
  const user = env.SSH_USER || "root";
  const password = env.SSH_PASSWORD;
  const port = Number(env.SSH_PORT || 22);
  const deployPort = env.DEPLOY_PORT || "8671";
  const adminEmail = env.ADMIN_EMAIL || "admin@admin.com";

  if (!host || !password) {
    throw new Error("SSH_IP and SSH_PASSWORD required in .env");
  }

  const authUrl = `http://${host}:${deployPort}`;
  const authSecret = execSync(
    "node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"",
    { encoding: "utf8" },
  ).trim();

  const tarPath = join(ROOT, "deploy-app.tgz");
  console.log("Creating archive...");
  execSync(
    `tar -czf "${tarPath}" --exclude=node_modules --exclude=.next --exclude=coverage --exclude=.git --exclude=notes --exclude=.env --exclude=deploy-app.tgz --exclude=deploy-image.tar -C "${ROOT}" .`,
    { stdio: "inherit", shell: true },
  );

  console.log(`Connecting to ${user}@${host}:${port}...`);
  const conn = await connect({ host, user, password, port });

  console.log("=== Server audit ===");
  await exec(conn, "set -e; uname -a; lsb_release -a 2>/dev/null || cat /etc/os-release");
  await exec(conn, "df -h / /var/lib/docker 2>/dev/null || df -h /");
  await exec(conn, "free -h || true");
  await exec(conn, ENSURE_SWAP);
  await exec(conn, "docker ps --format 'table {{.Names}}\\t{{.Ports}}\\t{{.Status}}'");
  await exec(conn, `ss -tlnp | grep -E ':${deployPort}\\b' || true`, { check: false });

  await exec(conn, `mkdir -p ${REMOTE_DIR}`);
  console.log("Uploading archive...");
  const uploadedBytes = await upload(conn, tarPath, `${REMOTE_DIR}/app.tgz`);
  await exec(conn, `test -f ${REMOTE_DIR}/app.tgz && ls -la ${REMOTE_DIR}/app.tgz`);
  console.log(`Uploaded ${uploadedBytes} bytes`);

  const prodEnv = [
    `DEPLOY_PORT=${deployPort}`,
    `AUTH_SECRET=${authSecret}`,
    `ADMIN_EMAIL=${adminEmail}`,
    `AUTH_URL=${authUrl}`,
    `INVESTOR_CONTACT_EMAIL=${env.INVESTOR_CONTACT_EMAIL || "investors@example.com"}`,
    "",
  ].join("\n");

  await exec(
    conn,
    `set -e; cd ${REMOTE_DIR}; rm -rf app; mkdir -p app; tar -xzf app.tgz -C app; rm app.tgz`,
  );
  await exec(
    conn,
    `cat > ${REMOTE_DIR}/app/.env.production << 'EOF'\n${prodEnv}EOF`,
  );

  console.log("=== Building on server (single npm ci, with swap) ===");
  await exec(
    conn,
    `set -e; cd ${REMOTE_DIR}/app; export DOCKER_BUILDKIT=1; ` +
      "docker compose -f docker-compose.prod.yml --env-file .env.production build --progress=plain",
  );
  await exec(
    conn,
    `set -e; cd ${REMOTE_DIR}/app; docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans`,
  );

  console.log("=== Container status and logs ===");
  await exec(
    conn,
    "docker ps -a --filter name=touch-typing-tutor --format 'table {{.Names}}\\t{{.Ports}}\\t{{.Status}}'",
  );
  await exec(
    conn,
    "docker inspect touch-typing-tutor --format 'Restarts={{.RestartCount}} State={{.State.Status}} ExitCode={{.State.ExitCode}} Error={{.State.Error}}' 2>/dev/null || true",
    { check: false },
  );
  await exec(conn, "docker logs touch-typing-tutor --tail 100 2>&1", { check: false });
  await exec(
    conn,
    `sleep 3; curl -sf -o /dev/null -w 'HTTP %{http_code}\\n' http://127.0.0.1:${deployPort}/ || echo 'curl failed'`,
    { check: false },
  );

  conn.end();
  console.log(`\nDeploy complete: ${authUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
