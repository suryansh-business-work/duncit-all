import { readFileSync, writeFileSync } from "node:fs";

/**
 * Apply literal single-occurrence replacements.
 *
 * The working tree is checked out with core.autocrlf=true, so files arrive with
 * CRLF (and some are mixed). The index stores LF either way, so normalising here
 * is invisible in the diff and lets every pattern be written with plain \n.
 */
export function apply(file, pairs) {
  let s = readFileSync(file, "utf8").split("\r\n").join("\n");
  for (const [from, to] of pairs) {
    const n = s.split(from).length - 1;
    if (n !== 1) throw new Error(`${file}: ${n} matches for ${JSON.stringify(from.slice(0, 70))}`);
    s = s.split(from).join(to);
  }
  writeFileSync(file, s, "utf8");
  console.log("ok", file);
}
