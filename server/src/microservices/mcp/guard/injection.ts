import { INJECTION_RULES, stripControls } from './patterns';

/**
 * Walks a tool's arguments or result looking for prompt-injection signatures
 * (patterns.ts), and strips the invisible control characters a result may
 * carry. Pure functions: the call pipeline decides what a flag means.
 */

export interface InjectionFlag {
  rule: string;
  /** JSON path of the string that matched, e.g. `$.input.pod_description`. */
  path: string;
  blocking: boolean;
}

const MAX_DEPTH = 12;
/** Enough to explain a refusal; a flood of matches says nothing more. */
const MAX_FLAGS = 50;

export function scanForInjection(value: unknown): InjectionFlag[] {
  const flags: InjectionFlag[] = [];
  const visit = (node: unknown, path: string, depth: number): void => {
    if (flags.length >= MAX_FLAGS || depth > MAX_DEPTH) return;
    if (typeof node === 'string') {
      for (const rule of INJECTION_RULES) {
        if (flags.length < MAX_FLAGS && rule.test(node)) flags.push({ rule: rule.id, path, blocking: rule.blocking });
      }
    } else if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1));
    } else if (node && typeof node === 'object') {
      for (const [key, item] of Object.entries(node)) visit(item, `${path}.${key}`, depth + 1);
    }
  };
  visit(value, '$', 0);
  return flags;
}

/** The value with every invisible control character removed, and how many were. */
export function stripInvisible(value: unknown): { value: unknown; stripped: number } {
  let stripped = 0;
  const clean = (node: unknown): unknown => {
    if (typeof node === 'string') {
      const clean = stripControls(node);
      stripped += clean.stripped;
      return clean.text;
    }
    if (Array.isArray(node)) return node.map(clean);
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([key, item]) => [key, clean(item)]));
    }
    return node;
  };
  return { value: clean(value), stripped };
}

export const hasBlockingFlag = (flags: readonly InjectionFlag[]): boolean => flags.some((flag) => flag.blocking);
