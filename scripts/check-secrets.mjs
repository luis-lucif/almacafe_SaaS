#!/usr/bin/env node
// Escanea el código fuente en busca de claves/secretos que NO deberían estar
// hardcodeados ni commiteados (service_role de Supabase, private keys, claves
// de AWS, etc.). No marca la anon/publishable key de Supabase ni las vars
// NEXT_PUBLIC_*, porque esas están diseñadas para ser públicas.
//
// Uso:
//   node scripts/check-secrets.mjs        (escanea el working tree)
//   node scripts/check-secrets.mjs --staged  (escanea solo lo staged, para pre-commit)

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SECRET_PATTERNS = [
  { name: "Supabase service_role key (JWT)", regex: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]*"role"\s*:\s*"service_role"[a-zA-Z0-9_.-]*/ },
  { name: "Referencia directa a service_role", regex: /service_role/i },
  { name: "Clave secreta de Supabase (sb_secret_...)", regex: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "AWS Access Key ID", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "Private key PEM", regex: /-----BEGIN (RSA |EC |)PRIVATE KEY-----/ },
  { name: "Token genérico hardcodeado (secret/token/apiKey = \"...\")", regex: /(secret|token|apikey|api_key|password)\s*[:=]\s*["'][A-Za-z0-9_\-./+]{20,}["']/i },
];

// Falsos positivos conocidos y aceptables: no bloquear por esto.
const ALLOW_PATTERNS = [/NEXT_PUBLIC_/, /sb_publishable_/, /anon/i];

const EXCLUDE_DIRS = ["node_modules", ".next", ".git", "supabase/.temp"];
const EXCLUDE_FILES = [".env.local", "check-secrets.mjs"];

function listFiles(staged) {
  const cmd = staged
    ? "git diff --cached --name-only --diff-filter=ACM"
    : "git ls-files --cached --others --exclude-standard";
  const out = execSync(cmd, { encoding: "utf8" });
  return out
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => !EXCLUDE_DIRS.some((d) => f.startsWith(d + "/") || f.includes(`/${d}/`)))
    .filter((f) => !EXCLUDE_FILES.some((ex) => f.endsWith(ex)));
}

function scanFile(path) {
  let content;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return []; // binario o no existe (borrado)
  }

  const findings = [];
  const lines = content.split("\n");

  for (const { name, regex } of SECRET_PATTERNS) {
    lines.forEach((line, i) => {
      if (!regex.test(line)) return;
      if (ALLOW_PATTERNS.some((allow) => allow.test(line))) return;
      findings.push({ path, line: i + 1, rule: name, snippet: line.trim().slice(0, 120) });
    });
  }

  // .env commiteado con datos reales (no .env.example / .env.local, que ya están gitignoreados)
  if (/^\.env(\..+)?$/.test(path.split("/").pop() ?? "") && !path.endsWith(".example")) {
    findings.push({ path, line: 0, rule: "Archivo .env commiteado", snippet: "(archivo completo)" });
  }

  return findings;
}

function main() {
  const staged = process.argv.includes("--staged");
  const files = listFiles(staged);
  const allFindings = files.flatMap(scanFile);

  if (allFindings.length === 0) {
    console.log(`✅ Sin secretos detectados (${files.length} archivos revisados).`);
    process.exit(0);
  }

  console.error(`🚨 Se encontraron ${allFindings.length} posible(s) secreto(s) expuesto(s):\n`);
  for (const f of allFindings) {
    console.error(`  ${f.path}:${f.line}  [${f.rule}]`);
    console.error(`    ${f.snippet}\n`);
  }
  console.error("Revisá y sacá estos valores del código antes de commitear/pushear.");
  process.exit(1);
}

main();
