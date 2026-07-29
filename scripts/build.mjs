import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const isVercel = process.env.VERCEL === "1";
const result = spawnSync(command, [isVercel ? "next" : "vinext", "build"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

if (!isVercel) {
  const prepared = spawnSync(process.execPath, ["scripts/prepare-sites.mjs"], {
    stdio: "inherit",
    env: process.env,
  });
  if (prepared.status !== 0) process.exit(prepared.status ?? 1);
}
