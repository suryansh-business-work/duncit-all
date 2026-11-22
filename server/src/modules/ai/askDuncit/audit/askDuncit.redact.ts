import { redactArgs } from '@microservices/mcp/usage/redact';

/**
 * Sensitive-data protection for everything Ask Duncit stores for operators:
 * audit rows, logs and the portal's conversation views.
 *
 * The person's own chat history keeps their words as typed (it is theirs);
 * every operator-facing copy is masked here first. Tool arguments go through
 * the MCP activity-log redaction (credential-named fields replaced, long values
 * cut) and then the same text masking.
 */

const MASKS: ReadonlyArray<{ pattern: RegExp; replace: string }> = [
  // Secrets that look like API keys or bearer tokens.
  { pattern: /\b(sk|pk|rk|dmcp_at|dmcp_rt)[-_][A-Za-z0-9_-]{12,}\b/g, replace: '[secret]' },
  { pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/gi, replace: 'Bearer [secret]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replace: '[email]' },
  // Card numbers (13–19 digits, optional spaces or dashes).
  { pattern: /\b(?:\d[ -]?){13,19}\b/g, replace: '[card]' },
  // Aadhaar (12 digits in groups of four).
  { pattern: /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, replace: '[id-number]' },
  // Indian mobile numbers, with or without +91.
  { pattern: /(?:\+?91[ -]?)?\b[6-9]\d{9}\b/g, replace: '[phone]' },
  // One-time codes typed next to the word.
  { pattern: /\b(otp|pin|code|password|passcode)\b\s*[:=-]?\s*\S+/gi, replace: '$1 [redacted]' },
];

export function maskSensitiveText(text: string | null | undefined, max = 4000): string {
  let out = String(text ?? '');
  for (const { pattern, replace } of MASKS) out = out.replace(pattern, replace);
  return out.length > max ? `${out.slice(0, max)}… (+${out.length - max} chars)` : out;
}

/** Tool arguments as an operator may read them. */
export const maskToolArgs = (args: unknown): string => maskSensitiveText(redactArgs(args), 8000);
