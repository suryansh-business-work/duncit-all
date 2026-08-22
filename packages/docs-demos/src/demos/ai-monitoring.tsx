import {
  aiMonitoringFallbackCopy,
  isAiMonitoringChipVisible,
  resolveAiMonitoringCopy,
  type AiMonitoringConfig,
} from '@duncit/ai-monitoring';
import { defineDemo, defineDemos } from '../types';

interface MonitoringMock {
  /** What the AI portal has configured. null = never configured. */
  config: AiMonitoringConfig | null;
}

export default defineDemos('ai-monitoring', [
  defineDemo<MonitoringMock>({
    id: 'copy',
    title: 'What the "AI monitored" chip actually says',
    note:
      'Set config to null and the shipped copy renders — the notice must never be blank, because it is the disclosure itself. Set chip_enabled to false and the chip goes away entirely.',
    mock: {
      config: {
        chip_enabled: true,
        chip_label: 'AI reviewed',
        dialog_title: 'How AI is used here',
        dialog_intro: 'Everything posted on Duncit is screened before it goes live.',
        dialog_points: [
          'Pod titles, descriptions and photos are checked automatically.',
          'Anything flagged is held for a human to review.',
          'No decision is final without a person behind it.',
        ],
        dialog_footnote: 'Questions? Write to support@duncit.com.',
        dismiss_label: 'Got it',
      },
    },
    compute: (mock) => ({
      'Is the chip shown': isAiMonitoringChipVisible(mock.config),
      'Copy rendered': resolveAiMonitoringCopy(mock.config, (key: string) => key),
      'Shipped fallback': aiMonitoringFallbackCopy((key: string) => key),
      'Why a null config still shows something':
        'The notice is a disclosure. An unconfigured surface falls back rather than saying nothing.',
    }),
  }),
]);
