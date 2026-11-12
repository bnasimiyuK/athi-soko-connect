import fs from "fs";
import path from "path";

const WRITE = process.argv.includes("--write");
const OLD_CONFIG = /^export const (dynamic|revalidate|fetchCache)\s*=.*;?[ \t]*\r?\n?/gm;
const LINE = "export const instant = false; // Cache Components: allow blocking route\n";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

let changed = 0;

for (const file of walk("app")) {
  const name = path.basename(file);
  if (!/^(layout|page|route)\.(tsx|ts|jsx|js)$/.test(name)) continue;

  const original = fs.readFileSync(file, "utf8");
  if (/^\s*["']use client["']/.test(original)) continue; // client files can't export it

  let text = original.replace(OLD_CONFIG, "");
  const removedOld = text !== original;
  const isRoute = name.startsWith("route.");
  const wantsInstant =
    !isRoute && !/export const instant\b/.test(text) && (name.startsWith("layout.") || removedOld);

  if (wantsInstant) {
    // put it after any leading "use server" directive, otherwise at the very top
    const m = text.match(/^\s*["']use server["'];?\s*\r?\n/);
    text = m ? text.slice(0, m[0].length) + LINE + text.slice(m[0].length) : LINE + text;
  }

  if (text !== original) {
    changed++;
    console.log((WRITE ? "FIXED   " : "WOULD FIX ") + file);
    if (WRITE) fs.writeFileSync(file, text);
  }
}

console.log(`\n${changed} file(s) ${WRITE ? "changed" : "need changes"}.` +
  (WRITE ? "" : " Run again with --write to apply."));