import { Alert, Chip, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '@duncit/app-settings';
import type { StoreReleaseAdvice } from './queries';

type ChipColor = 'default' | 'info' | 'success' | 'warning';

const CONFIDENCE_COLOR: Record<string, ChipColor> = { HIGH: 'success', MEDIUM: 'info', LOW: 'warning' };
const CONFIDENCE_KEY: Record<string, string> = {
  HIGH: 'tech.appBuilds.releaseConfidenceHigh',
  MEDIUM: 'tech.appBuilds.releaseConfidenceMedium',
  LOW: 'tech.appBuilds.releaseConfidenceLow',
};

/** One titled list of the advice — causes, steps or next time. Numbered when the order matters. */
function AdviceList({ title, items, numbered }: Readonly<{ title: string; items: string[]; numbered?: boolean }>) {
  if (items.length === 0) return null;
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2">{title}</Typography>
      <List dense disablePadding component={numbered ? 'ol' : 'ul'} sx={{ pl: 2.5, listStyleType: numbered ? 'decimal' : 'disc' }}>
        {items.map((item) => (
          <ListItem key={item} disableGutters sx={{ display: 'list-item', py: 0.25 }}>
            <ListItemText primary={item} slotProps={{ primary: { variant: 'body2' } }} />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

/**
 * What OpenAI advised: the summary with how sure it is, then the likely causes,
 * the steps to take now and what to change next time. Says so when there is no
 * advice yet, or why there is none.
 */
export default function ReleaseAdvice({ advice }: Readonly<{ advice: StoreReleaseAdvice | null }>) {
  const { t } = useTranslation();
  if (!advice) return <Alert severity="info">{t('tech.appBuilds.releaseAdvicePending')}</Alert>;
  if (!advice.summary) {
    return <Alert severity="warning">{advice.error || t('tech.appBuilds.releaseAdviceNone')}</Alert>;
  }
  const confidenceKey = CONFIDENCE_KEY[advice.confidence];
  return (
    <Stack spacing={1.5} data-testid="release-advice">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('tech.appBuilds.releaseAdviceTitle')}
        </Typography>
        {confidenceKey && (
          <Chip
            size="small"
            variant="outlined"
            color={CONFIDENCE_COLOR[advice.confidence] ?? 'default'}
            label={t(confidenceKey)}
          />
        )}
      </Stack>
      <Typography variant="body2">{advice.summary}</Typography>
      <AdviceList title={t('tech.appBuilds.releaseAdviceCauses')} items={advice.causes} />
      <AdviceList title={t('tech.appBuilds.releaseAdviceSteps')} items={advice.steps} numbered />
      <AdviceList title={t('tech.appBuilds.releaseAdviceNextTime')} items={advice.next_time} />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.appBuilds.releaseAdviceMeta', {
          vars: { model: advice.model, when: advice.generated_at ? formatDateTime(advice.generated_at) : '—' },
        })}
      </Typography>
    </Stack>
  );
}
