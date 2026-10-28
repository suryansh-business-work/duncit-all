import { Link as RouterLink } from 'react-router';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { OUTCOME_COLORS, outcomeKey } from './status';

interface Props {
  title: string;
  /** Null when this kind of run has never finished. */
  status: string | null;
  lines: readonly string[];
  to: string;
}

/** One kind of run: what it is, how it ended, the facts under it, and the way into it. */
export default function RunRow({ title, status, lines, to }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2">{title}</Typography>
          {status && (
            <StatusChip
              status={status}
              colorMap={OUTCOME_COLORS}
              label={t(outcomeKey(status))}
              size="small"
            />
          )}
        </Stack>
        {status ? (
          lines.map((line) => (
            <Typography key={line} variant="body2" sx={{ color: 'text.secondary' }}>
              {line}
            </Typography>
          ))
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tests.dashboard.runs.none')}
          </Typography>
        )}
      </Stack>
      <Button component={RouterLink} to={to} size="small" sx={{ flexShrink: 0 }} aria-label={t('tests.common.openNamed', { vars: { name: title } })}>
        {t('tests.common.open')}
      </Button>
    </Stack>
  );
}
