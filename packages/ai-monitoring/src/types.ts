/**
 * Translate one key. Structurally satisfied by @duncit/i18n's `t`, mWeb's
 * `useTranslation().t` and the native app's `Translate` — typed here rather
 * than imported so this package keeps zero dependencies and Metro can bundle
 * it from source for the native app.
 */
export type AiMonitoringTranslate = (key: string) => string;

/**
 * The admin-managed chip/dialog copy, exactly as `aiMonitoringConfig` returns
 * it. A null field means "no override": the surface renders its own localized
 * fallback instead, so untouched copy still follows the reader's language.
 */
export interface AiMonitoringConfig {
  chip_enabled: boolean;
  chip_label: string | null;
  dialog_title: string | null;
  dialog_intro: string | null;
  dialog_points: string[];
  dialog_footnote: string | null;
  dismiss_label: string | null;
}

/** The resolved strings a chip and its dialog actually render. */
export interface AiMonitoringCopy {
  chipLabel: string;
  title: string;
  intro: string;
  points: string[];
  footnote: string;
  dismissLabel: string;
}
