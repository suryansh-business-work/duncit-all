import { SHELL_BUNDLE } from '../../../packages/i18n/src/bundles/shell';
import { WEBSITE_APP_BUNDLE } from '../../../packages/i18n/src/bundles/website-app';
import { interpolate } from '../../../packages/i18n/src/translator';

/** The shipped English copy for a key, so a test asserts what the operator reads. */
export function en(key: string, vars: Record<string, string | number> = {}): string {
  for (const bundle of [WEBSITE_APP_BUNDLE, SHELL_BUNDLE]) {
    let cursor: unknown = bundle;
    for (const part of key.split('.')) cursor = (cursor as Record<string, unknown> | undefined)?.[part];
    if (typeof cursor === 'string') return interpolate(cursor, vars);
  }
  throw new Error(`No English copy for ${key}`);
}

const escapeRegExp = (text: string) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** A matcher for a field label whose required star is appended by the field. */
export const label = (key: string) => new RegExp(String.raw`^${escapeRegExp(en(key))}\s*\*?$`);
