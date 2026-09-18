import { SHIPPED_CLIENT_KEYS } from '@modules/platform/localization/shipped-keys';
import { localizationService } from '@modules/platform/localization/localization.service';
import { emailTranslationVars } from '@services/email/email-i18n';

/**
 * The words of an analytics report, in the reader's language.
 *
 * A report names the same tiles the Analytics console does, so it reads the
 * console's own `analytics.*` keys — the shipped English from
 * `SHIPPED_CLIENT_KEYS`, overlaid with Admin > Localization's text for the
 * locale — and the email's own `email.*` keys through `emailTranslationVars`.
 * One translation per tile, whether it is read on screen, in the mail or in
 * the PDF.
 */

const CLIENT_PREFIX = 'analytics.';

const SHIPPED_ANALYTICS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(SHIPPED_CLIENT_KEYS).filter(([key]) => key.startsWith(CLIENT_PREFIX))
);

/**
 * A server key's segment in its translation key: `fill_rate` → `fillRate`.
 * The console's copy maps follow this for every tile, ranking and column, so
 * the server can name them without a second copy of those maps.
 */
export const copySegment = (key: string): string =>
  key.replaceAll(/_([a-z\d])/g, (_match, char: string) => char.toUpperCase());

export interface ReportCopy {
  /** The key's text, `{name}` placeholders filled from `vars`; the key itself when nothing has it. */
  t(key: string, vars?: Readonly<Record<string, string | number>>): string;
  /** The locale the words are in — also the one dates and weekdays are named in. */
  locale: string;
}

async function clientTranslations(code: string | null): Promise<Record<string, string>> {
  const out: Record<string, string> = { ...SHIPPED_ANALYTICS };
  if (!code) return out;
  try {
    for (const entry of await localizationService.publicTranslations(code)) {
      if (entry.key.startsWith(CLIENT_PREFIX)) out[entry.key] = entry.value;
    }
  } catch {
    // The shipped English still reads as a complete report.
  }
  return out;
}

const fill = (text: string, vars: Readonly<Record<string, string | number>>) =>
  text.replaceAll(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));

export async function reportCopy(locale: string | null): Promise<ReportCopy> {
  const code = locale || (await localizationService.defaultLocaleCode().catch(() => null));
  const [client, mail] = await Promise.all([clientTranslations(code), emailTranslationVars(code)]);
  return {
    locale: code || 'en',
    t: (key, vars = {}) => fill(client[key] ?? mail[`t:${key}`] ?? key, vars),
  };
}
