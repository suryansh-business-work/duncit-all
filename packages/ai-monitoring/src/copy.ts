import type { AiMonitoringConfig, AiMonitoringCopy, AiMonitoringTranslate } from './types';

/**
 * Every key this package renders, written out literally.
 *
 * They are literals rather than a composed `aiMonitoring.${name}` on purpose:
 * the Shared Gates check greps the source for `t('…')` to prove a key is
 * shipped, and a composed key is invisible to it. Adding a bullet means adding
 * a line here AND a line in AI_MONITORING_BUNDLE — nothing else.
 */
export function aiMonitoringFallbackCopy(t: AiMonitoringTranslate): AiMonitoringCopy {
  return {
    chipLabel: t('aiMonitoring.chipLabel'),
    title: t('aiMonitoring.dialogTitle'),
    intro: t('aiMonitoring.dialogIntro'),
    points: [
      t('aiMonitoring.pointScan'),
      t('aiMonitoring.pointPrivate'),
      t('aiMonitoring.pointFlag'),
      t('aiMonitoring.pointLog'),
    ],
    footnote: t('aiMonitoring.dialogFootnote'),
    dismissLabel: t('aiMonitoring.dismiss'),
  };
}

/** Trimmed override, or the fallback when the admin left the field blank. */
const pick = (override: string | null | undefined, fallback: string): string => {
  const trimmed = override?.trim();
  return trimmed ? trimmed : fallback;
};

/**
 * The copy one AI Monitoring chip renders: the admin's overrides layered over
 * the surface's localized fallback.
 *
 * This is the whole reason the package exists. The chip is drawn twice — MUI
 * for mWeb and the portals, Tamagui for the native app — but which sentence it
 * draws is decided exactly once, here, so an edit in AI Portal > AI Monitoring
 * > Settings cannot land on one surface and miss the other.
 */
export function resolveAiMonitoringCopy(
  config: AiMonitoringConfig | null | undefined,
  t: AiMonitoringTranslate,
): AiMonitoringCopy {
  const fallback = aiMonitoringFallbackCopy(t);
  if (!config) return fallback;
  const points = config.dialog_points.map((p) => p.trim()).filter(Boolean);
  return {
    chipLabel: pick(config.chip_label, fallback.chipLabel),
    title: pick(config.dialog_title, fallback.title),
    intro: pick(config.dialog_intro, fallback.intro),
    points: points.length > 0 ? points : fallback.points,
    footnote: pick(config.dialog_footnote, fallback.footnote),
    dismissLabel: pick(config.dismiss_label, fallback.dismissLabel),
  };
}

/**
 * Whether the chip renders at all.
 *
 * Unknown config means "show it": the notice explaining that an upload is
 * screened must not disappear because a settings request was slow, and the
 * admin switch is the only thing that may hide it.
 */
export function isAiMonitoringChipVisible(config: AiMonitoringConfig | null | undefined): boolean {
  return config ? config.chip_enabled : true;
}
