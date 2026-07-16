/**
 * Pretty-prints an MJML source string: one tag per line, two-space
 * indentation by nesting depth. Extracted from the identical copies in the
 * crm, marketing and tech email-template editors.
 */
export function formatMjml(source: string): string {
  const lines = source
    .replace(/>\s+</g, '>\n<')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let depth = 0;
  return lines
    .map((line) => {
      if (line.startsWith('</')) depth = Math.max(0, depth - 1);
      const formatted = `${'  '.repeat(depth)}${line}`;
      const opens = /^<mj-[\w-]+\b/i.test(line) || /^<mjml\b/i.test(line);
      const closes = /<\//.test(line) || line.endsWith('/>');
      if (opens && !closes) depth += 1;
      return formatted;
    })
    .join('\n');
}
