import { describe, expect, it } from 'vitest';

import { aiMonitoringFallbackCopy, isAiMonitoringChipVisible, resolveAiMonitoringCopy } from '../src/copy';
import type { AiMonitoringConfig } from '../src/types';

/** Echoes the key back, so a test can see which key each sentence came from. */
const t = (key: string) => key;

const config = (over: Partial<AiMonitoringConfig> = {}): AiMonitoringConfig =>
  ({
    chip_enabled: true,
    chip_label: null,
    dialog_title: null,
    dialog_intro: null,
    dialog_points: [],
    dialog_footnote: null,
    dismiss_label: null,
    ...over,
  }) as AiMonitoringConfig;

describe('aiMonitoringFallbackCopy', () => {
  it('reads every sentence from the translator — the package ships no English of its own', () => {
    expect(aiMonitoringFallbackCopy(t)).toEqual({
      chipLabel: 'aiMonitoring.chipLabel',
      title: 'aiMonitoring.dialogTitle',
      intro: 'aiMonitoring.dialogIntro',
      points: [
        'aiMonitoring.pointScan',
        'aiMonitoring.pointPrivate',
        'aiMonitoring.pointFlag',
        'aiMonitoring.pointLog',
      ],
      footnote: 'aiMonitoring.dialogFootnote',
      dismissLabel: 'aiMonitoring.dismiss',
    });
  });
});

describe('resolveAiMonitoringCopy', () => {
  it('falls back entirely while the settings request is still out', () => {
    expect(resolveAiMonitoringCopy(null, t)).toEqual(aiMonitoringFallbackCopy(t));
    expect(resolveAiMonitoringCopy(undefined, t)).toEqual(aiMonitoringFallbackCopy(t));
  });

  it('layers the admin’s overrides over the localized fallback', () => {
    const copy = resolveAiMonitoringCopy(
      config({ chip_label: 'Screened', dialog_title: 'How we screen uploads' }),
      t
    );

    expect(copy.chipLabel).toBe('Screened');
    expect(copy.title).toBe('How we screen uploads');
    expect(copy.intro).toBe('aiMonitoring.dialogIntro');
  });

  it('treats a blank or whitespace override as "not set" rather than as empty copy', () => {
    const copy = resolveAiMonitoringCopy(config({ chip_label: '   ', dialog_footnote: '' }), t);

    expect(copy.chipLabel).toBe('aiMonitoring.chipLabel');
    expect(copy.footnote).toBe('aiMonitoring.dialogFootnote');
  });

  it('trims an override the admin typed with stray spaces', () => {
    expect(resolveAiMonitoringCopy(config({ dismiss_label: '  Got it  ' }), t).dismissLabel).toBe('Got it');
  });

  it('replaces the whole bullet list when the admin wrote one', () => {
    expect(resolveAiMonitoringCopy(config({ dialog_points: ['  One  ', 'Two'] }), t).points).toEqual(['One', 'Two']);
  });

  it('keeps the fallback bullets when the admin list is empty or only blanks', () => {
    expect(resolveAiMonitoringCopy(config({ dialog_points: [] }), t).points).toEqual(aiMonitoringFallbackCopy(t).points);
    expect(resolveAiMonitoringCopy(config({ dialog_points: ['  ', ''] }), t).points).toEqual(
      aiMonitoringFallbackCopy(t).points
    );
  });
});

describe('isAiMonitoringChipVisible', () => {
  it('shows the notice while the config is unknown — a slow request must not hide it', () => {
    expect(isAiMonitoringChipVisible(null)).toBe(true);
    expect(isAiMonitoringChipVisible(undefined)).toBe(true);
  });

  it('lets only the admin switch hide it', () => {
    expect(isAiMonitoringChipVisible(config({ chip_enabled: true }))).toBe(true);
    expect(isAiMonitoringChipVisible(config({ chip_enabled: false }))).toBe(false);
  });
});
