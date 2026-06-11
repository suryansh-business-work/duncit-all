/**
 * Lightweight, dependency-free MJML pretty-printer: splits adjacent tags onto
 * their own lines and re-indents by nesting depth. Good enough for tidying the
 * editor source; not a full XML formatter.
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
