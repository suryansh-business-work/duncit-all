/**
 * The ISO language catalogue every locale picker offers.
 *
 * Admin > Localization > Locales used to ask for a BCP-47 tag and the
 * language's own name typed by hand — so in practice only English was ever
 * added, and with nothing to translate INTO, auto-translation had nothing to
 * do. This ships the list instead.
 *
 * The NAMES are not stored here. `Intl.DisplayNames` already knows what every
 * language is called in English and in its own script, in every runtime this
 * package builds for, and a hand-written table of 184 endonyms in 40 scripts is
 * a table that would be wrong somewhere and never corrected. So this file holds
 * the codes and the writing direction, and asks the platform for the words.
 */

/** One language a locale picker can offer, ready to save as a Locale row. */
export interface LocaleOption {
  /** BCP-47 tag — the stable id stored on every user's profile. */
  code: string;
  /** Endonym: the language's name in its own script, e.g. "हिन्दी". */
  label: string;
  /** English name for admin lists, e.g. "Hindi (India)". */
  english_label: string;
  /** Right-to-left script — flips document direction / RN I18nManager. */
  is_rtl: boolean;
}

/**
 * Every ISO 639-1 language (the two-letter set), in code order.
 *
 * 639-1 rather than 639-2/3 on purpose: it is the part of ISO that BCP-47 uses
 * for a primary subtag, and it is what `Intl` can name. A language outside it
 * can still be typed into the picker by hand.
 */
export const ISO_639_1_LANGUAGES: readonly string[] = [
  'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az',
  'ba', 'be', 'bg', 'bh', 'bi', 'bm', 'bn', 'bo', 'br', 'bs',
  'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy',
  'da', 'de', 'dv', 'dz',
  'ee', 'el', 'en', 'eo', 'es', 'et', 'eu',
  'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy',
  'ga', 'gd', 'gl', 'gn', 'gu', 'gv',
  'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz',
  'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu',
  'ja', 'jv',
  'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky',
  'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv',
  'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my',
  'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny',
  'oc', 'oj', 'om', 'or', 'os',
  'pa', 'pi', 'pl', 'ps', 'pt',
  'qu',
  'rm', 'rn', 'ro', 'ru', 'rw',
  'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr',
  'ss', 'st', 'su', 'sv', 'sw',
  'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty',
  'ug', 'uk', 'ur', 'uz',
  've', 'vi', 'vo',
  'wa', 'wo',
  'xh',
  'yi', 'yo',
  'za', 'zh', 'zu',
];

/**
 * Language+country tags worth offering ready-made, because they are the ones a
 * Duncit operator actually reaches for: every Indian scheduled language that
 * has a 639-1 code, plus the markets the product is read from.
 *
 * This is a shortlist, not a limit — the picker accepts any tag typed into it,
 * so `es-CO` or `fr-SN` needs no code change here.
 */
export const COMMON_REGION_LOCALES: readonly string[] = [
  'en-IN', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN', 'gu-IN', 'kn-IN',
  'ml-IN', 'pa-IN', 'or-IN', 'as-IN', 'ur-IN', 'ne-IN', 'sa-IN', 'sd-IN', 'ks-IN',
  'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-SG', 'en-AE', 'en-ZA',
  'ar-AE', 'ar-SA', 'ar-EG',
  'zh-CN', 'zh-TW', 'zh-HK',
  'pt-BR', 'pt-PT',
  'es-ES', 'es-MX', 'es-AR',
  'fr-FR', 'fr-CA',
  'de-DE', 'de-AT', 'it-IT', 'nl-NL',
  'ja-JP', 'ko-KR', 'ru-RU', 'tr-TR', 'uk-UA',
  'id-ID', 'ms-MY', 'th-TH', 'vi-VN', 'fil-PH',
  'he-IL', 'fa-IR',
  'pl-PL', 'sv-SE', 'da-DK', 'nb-NO', 'fi-FI', 'cs-CZ', 'el-GR', 'hu-HU', 'ro-RO',
  'sw-KE', 'af-ZA', 'zu-ZA', 'am-ET',
];

/**
 * ISO 15924 scripts written right to left.
 *
 * Keyed on the SCRIPT rather than the language because the script is what
 * decides direction: `ku` is left-to-right in Latin and right-to-left in
 * Arabic, and `sr` swaps script by region. `Intl.Locale#maximize()` resolves
 * the tag to its script, so `ku-Arab` and `ckb` both come out right without a
 * per-language exception list.
 */
const RTL_SCRIPTS: ReadonlySet<string> = new Set([
  'Adlm', 'Arab', 'Aran', 'Armi', 'Avst', 'Cprt', 'Egyp', 'Hatr', 'Hebr',
  'Hung', 'Khar', 'Lydi', 'Mand', 'Mani', 'Mend', 'Merc', 'Mero', 'Narb',
  'Nbat', 'Nkoo', 'Orkh', 'Palm', 'Phli', 'Phlp', 'Phnx', 'Prti', 'Rohg',
  'Samr', 'Sarb', 'Sogd', 'Sogo', 'Syrc', 'Thaa', 'Yezi',
]);

/** A tag ICU cannot parse at all — the picker accepts typed input, so this is reachable. */
const isUsableTag = (code: string): boolean => {
  try {
    new Intl.Locale(code);
    return true;
  } catch {
    return false;
  }
};

/**
 * Whether a locale is written right to left.
 *
 * Answers `false` for a tag ICU cannot parse, because an unreadable tag is not
 * evidence of anything and left-to-right is what every surface already renders.
 */
export function isRtlLocale(code: string): boolean {
  const tag = code.trim();
  if (!tag || !isUsableTag(tag)) return false;
  return RTL_SCRIPTS.has(new Intl.Locale(tag).maximize().script ?? '');
}

/** The language's name, asked for in the language named by `displayIn`. */
function displayName(code: string, displayIn: string): string {
  const names = new Intl.DisplayNames([displayIn], { type: 'language', fallback: 'code' });
  // `fallback: 'code'` answers with the tag itself rather than `undefined`;
  // only `fallback: 'none'` can return nothing, and this never asks for that.
  return names.of(code) as string;
}

/**
 * One picker row for a tag: its own name, its English name and its direction.
 *
 * An unparseable tag comes back described by itself rather than throwing — the
 * picker lets an operator type a tag ICU has never heard of, and the row it
 * makes is still savable.
 */
export function describeLocale(code: string): LocaleOption {
  const tag = code.trim();
  if (!isUsableTag(tag)) {
    return { code: tag, label: tag, english_label: tag, is_rtl: false };
  }
  return {
    code: tag,
    label: displayName(tag, tag),
    english_label: displayName(tag, 'en'),
    is_rtl: isRtlLocale(tag),
  };
}

/**
 * Every offered locale, described and sorted by English name.
 *
 * The two source lists are disjoint by construction — every region tag carries
 * a `-` and no ISO 639-1 code does — so nothing here de-duplicates them. The
 * tests assert that, which is the only place it can actually be checked.
 */
export function localeOptions(): LocaleOption[] {
  return [...COMMON_REGION_LOCALES, ...ISO_639_1_LANGUAGES]
    .map(describeLocale)
    .sort((a, b) => a.english_label.localeCompare(b.english_label));
}
