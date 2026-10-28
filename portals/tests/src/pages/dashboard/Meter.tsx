import { LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { pctText } from './status';

interface Props {
  label: string;
  /** 0-100, or null when there is no reading. */
  value: number | null | undefined;
  /** A line under the bar (a ratio, a weight). */
  caption?: string;
}

/** One labelled 0-100 reading with its bar. A missing reading says so instead of drawing zero. */
export default function Meter({ label, value, caption }: Readonly<Props>) {
  const { t } = useTranslation();
  const text = pctText(value);
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 'fontWeightBold', color: text ? 'text.primary' : 'text.secondary' }}>
          {text ? t('tests.common.percent', { vars: { value: text } }) : t('tests.common.noData')}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={value ?? 0}
        aria-label={text ? t('tests.dashboard.confidence.meterLabel', { vars: { signal: label, value: text } }) : label}
      />
      {caption && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {caption}
        </Typography>
      )}
    </Stack>
  );
}
