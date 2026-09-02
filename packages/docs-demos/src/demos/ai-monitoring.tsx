import { Stack } from '@mui/material';
import {
  aiMonitoringFallbackCopy,
  isAiMonitoringChipVisible,
  resolveAiMonitoringCopy,
  type AiMonitoringConfig,
} from '@duncit/ai-monitoring';
import { AiMonitorGlyph, AiMonitorPill, AiProcessingInline } from '@duncit/ai-monitoring/mui';
import { AI_MONITOR_MOTION } from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

interface MonitoringMock {
  /** What the AI portal has configured. null = never configured. */
  config: AiMonitoringConfig | null;
}

interface MotionMock {
  /** What the gradient pill says, on a pod row or a Create Pod step. */
  pillLabel: string;
  /** What the running check is doing, in the reader's language. */
  checkingLabel: string;
  /** Is a check running right now? Flip it and the rings appear. */
  running: boolean;
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
  defineDemo<MotionMock>({
    id: 'motion',
    title: 'The motion language: idle, and running',
    note:
      'Flip `running` to false and the rings stop — they are the claim that a check is in flight, so a badge that emitted them while merely labelling something would be lying. Every animation here goes through `aiMotion`, so all of it stands still under prefers-reduced-motion.',
    mock: {
      pillLabel: 'AI Monitoring',
      checkingLabel: 'AI is checking all your details…',
      running: true,
    },
    render: (mock) => (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <AiMonitorGlyph size={26} />
          <AiMonitorGlyph size={40} />
          <AiMonitorGlyph size={56} rings={mock.running} />
        </Stack>
        <AiMonitorPill label={mock.pillLabel} onClick={() => undefined} />
        <AiProcessingInline visible={mock.running} label={mock.checkingLabel} />
      </Stack>
    ),
    compute: (mock) => ({
      'Rings in flight': mock.running,
      'Timings, shared with the native app': AI_MONITOR_MOTION,
      'Where they live':
        '@duncit/utils — beside AI_MONITOR_GRADIENT, because the native app animates the same badge and cannot import the MUI half.',
    }),
  }),
]);
