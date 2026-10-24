import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const documentationPath = "docs/application-features.md";
const requiredSections = [
  "## Hogares y listas",
  "## Artículos y catálogo",
  "## Compra y carrito",
  "## Historial y sugerencias",
  "## Cuenta y administración",
  "## Regla de actualización",
];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const base = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : process.argv[2] ?? "main";
const changedFiles = git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean);
const functionalChange = changedFiles.some((file) =>
  /^(app\/(actions|api|mcp|ui|\([^/]+\))|shared\/|supabase\/migrations\/|app\/lib\/)/.test(file),
);

let documentation;
try {
  documentation = readFileSync(documentationPath, "utf8");
} catch {
  console.error(`Missing required feature inventory: ${documentationPath}`);
  process.exit(1);
}

const missingSections = requiredSections.filter((section) => !documentation.includes(section));
if (missingSections.length) {
  console.error(`Feature inventory is missing: ${missingSections.join(", ")}`);
  process.exit(1);
}

if (functionalChange && !changedFiles.includes(documentationPath)) {
  console.error(
    `Functional files changed without updating ${documentationPath}. Add or revise the affected entity capability in the same PR.`,
  );
  process.exit(1);
}

console.log(
  functionalChange
    ? `Feature inventory updated for ${changedFiles.length} changed file(s).`
    : "Feature inventory is present; no functional change requires an update.",
);
