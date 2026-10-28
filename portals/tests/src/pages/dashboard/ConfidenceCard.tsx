import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SectionCard, StatusChip } from '@duncit/ui';
import type { TestsConfidenceSignal, TestsOverview } from '@duncit/gql-types';
import Meter from './Meter';
import { BAND_COLORS, BAND_KEYS, pctText, SIGNAL_KEYS } from './status';

type Props = Readonly<{ overview: Pick<TestsOverview, 'score' | 'band' | 'signals'> }>;

/** The caption under one signal: its weight, and what it added to the score — or that it was left out. */
function useSignalCaption() {
  const { t } = useTranslation();
  return (s: TestsConfidenceSignal) => {
    const weight = t('tests.dashboard.confidence.weight', { vars: { weight: String(s.weight) } });
    if (s.contribution === null || s.contribution === undefined) {
      return `${weight} · ${t('tests.dashboard.confidence.leftOut')}`;
    }
    return `${weight} · ${t('tests.dashboard.confidence.contribution', { vars: { points: String(s.contribution) } })}`;
  };
}

/** The headline number and every signal behind it, so a score is never a black box. */
export default function ConfidenceCard({ overview }: Props) {
  const { t } = useTranslation();
  const caption = useSignalCaption();
  const score = pctText(overview.score);
  const band = t(BAND_KEYS[overview.band]);

  return (
    <SectionCard title={t('tests.dashboard.confidence.title')} subtitle={t('tests.dashboard.confidence.subtitle')}>
      <Stack spacing={2.5}>
        <Stack
          direction="row"
          sx={{ alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}
          aria-label={score ? t('tests.dashboard.confidence.scoreLabel', { vars: { score, band } }) : band}
          role="group"
        >
          {score && (
            <>
              <Typography component="p" variant="h2" sx={{ fontWeight: 'fontWeightBold', lineHeight: 1 }}>
                {score}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('tests.dashboard.confidence.outOf')}
              </Typography>
            </>
          )}
          <StatusChip status={overview.band} colorMap={BAND_COLORS} label={band} size="small" />
        </Stack>
        {!score && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tests.dashboard.confidence.empty')}
          </Typography>
        )}
        <Stack spacing={1.75}>
          {overview.signals.map((s) => (
            <Meter
              key={s.signal}
              label={t(SIGNAL_KEYS[s.signal])}
              value={s.value}
              caption={caption(s)}
            />
          ))}
        </Stack>
      </Stack>
    </SectionCard>
  );
}
