import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const lock = readFileSync(new URL("../yarn.lock", import.meta.url), "utf8");
const errors = [];
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

for (const group of ["dependencies", "devDependencies", "optionalDependencies", "resolutions"]) {
  for (const [name, version] of Object.entries(manifest[group] ?? {})) {
    if (!exactVersion.test(version)) errors.push(`${group}.${name} must use an exact version`);
  }
}
for (const name of Object.keys(manifest.scripts ?? {})) {
  if (/^(pre|post)/.test(name) || ["install", "prepare"].includes(name)) {
    errors.push(`Automatic lifecycle hook is forbidden: ${name}`);
  }
}
if (manifest.packageManager !== "yarn@1.22.22") errors.push("Use the reviewed Yarn 1.22.22 release");

const entries = lock.split(/\n\n+/).filter((entry) => /^\S.*:\n  version /m.test(entry));
if (!entries.length) errors.push("The reviewed yarn.lock is required");
for (const entry of entries) {
  if (!/^  resolved "https:\/\/registry\.npmjs\.org\/[^"\s]+"$/m.test(entry)) {
    errors.push(`Unexpected dependency source: ${entry.split("\n")[0]}`);
  }
  if (!/^  integrity sha512-[A-Za-z0-9+/]+={0,2}$/m.test(entry)) {
    errors.push(`Missing SHA-512 integrity: ${entry.split("\n")[0]}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.info(`Dependency policy passed: exact versions, no lifecycle hooks, ${entries.length} locked packages with SHA-512.`);
}
