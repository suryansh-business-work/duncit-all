import { readFileSync, writeFileSync } from "node:fs";

/**
 * Turn a marketing site's `siteConfig` object literal into
 *   - a nested catalogue section for @duncit/i18n, and
 *   - the same literal with every copy leaf replaced by a t('…') call.
 *
 * Non-copy leaves (URLs, Font Awesome classes, anchors, CRM source enums) are
 * left exactly as they were.
 */
const NON_COPY_KEYS = new Set(["icon", "href", "image", "source", "slug", "id", "zone"]);

function isCopy(value, key) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (NON_COPY_KEYS.has(key)) return false;
  if (/^(https?:|\/|#|fa-|mailto:|tel:)/.test(value)) return false;
  if (/^[A-Z0-9_]+$/.test(value)) return false;
  return true;
}

const q = (s) => "'" + s.replaceAll("\\", "\\\\").replaceAll("'", "\'") + "'";

/** Array items get `item1`, `item2`… so a translator sees an order, not an index. */
const itemKey = (i) => `item${i + 1}`;

export function walk(node, path, indent, bundle, code, opts = {}) {
  const pad = " ".repeat(indent);
  const entries = Array.isArray(node)
    ? node.map((v, i) => [itemKey(i), v, i])
    : Object.entries(node).map(([k, v]) => [k, v, null]);

  for (const [key, value, index] of entries) {
    const here = [...path, key];
    if (value && typeof value === "object") {
      const isArr = Array.isArray(node);
      bundle.push(`${pad}${key}: {`);
      code.push(isArr ? `${pad}{` : `${pad}${key}: {`);
      walk(value, here, indent + 2, bundle, code, opts);
      bundle.push(`${pad}},`);
      code.push(isArr ? `${pad}},` : `${pad}},`);
    } else if (isCopy(value, key)) {
      bundle.push(`${pad}${key}: ${q(value)},`);
      code.push(`${pad}${key}: t('${opts.ns}.${here.join(".")}'),`);
    } else {
      const literal = typeof value === "string" ? q(value) : String(value);
      code.push(`${pad}${key}: ${literal},`);
    }
    void index;
  }
  return { bundle, code };
}
