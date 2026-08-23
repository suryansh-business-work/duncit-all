import { readFileSync, writeFileSync } from "node:fs";

/** Is this string leaf copy a visitor reads (vs a URL, icon class, anchor, enum)? */
export function isCopy(value, key) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (key === "icon" || key === "href" || key === "image" || key === "source") return false;
  if (key === "slug" || key === "id" || key === "key" || key === "zone") return false;
  if (/^(https?:|\/|#|fa-|mailto:|tel:)/.test(value)) return false;
  if (/^[A-Z0-9_]+$/.test(value)) return false;
  return true;
}

const q = (s) => "'" + s.replaceAll("\\", "\\\\").replaceAll("'", "\'") + "'";

/** Nested catalogue rows for every copy leaf, keyed by its path. */
export function emitBundle(node, indent, out = []) {
  const pad = " ".repeat(indent);
  if (Array.isArray(node)) {
    node.forEach((item, i) => {
      out.push(`${pad}i${i}: {`);
      emitBundle(item, indent + 2, out);
      out.push(`${pad}},`);
    });
    return out;
  }
  for (const [k, v] of Object.entries(node)) {
    if (v && typeof v === "object") {
      out.push(`${pad}${k}: {`);
      emitBundle(v, indent + 2, out);
      out.push(`${pad}},`);
    } else if (isCopy(v, k)) {
      out.push(`${pad}${k}: ${q(v)},`);
    }
  }
  return out;
}
