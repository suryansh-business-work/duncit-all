const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Text made safe to place inside HTML — element content or a quoted attribute.
 * Everything the server writes into markup from data (a crawler's card, an
 * analytics report's names) goes through this one function.
 */
export const escapeHtml = (value: string): string =>
  value.replaceAll(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
