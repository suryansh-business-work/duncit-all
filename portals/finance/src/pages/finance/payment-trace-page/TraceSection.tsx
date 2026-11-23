import type { ReactNode } from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import DetailCard from '../failed-payments-page/detail/DetailCard';

/** One line of a log as the trace shows it. */
export interface TraceEntry {
  key: string;
  title: ReactNode;
  chips: string[];
  when: string;
  lines: { label: string; value: ReactNode }[];
}

interface Props {
  title: string;
  entries: TraceEntry[];
  testId: string;
}

function EntryRow({ entry }: Readonly<{ entry: TraceEntry }>) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
          <Typography variant="body2" component="span" sx={{ fontWeight: 600, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {entry.title}
          </Typography>
          {entry.chips.filter(Boolean).map((chip) => (
            <Chip key={chip} size="small" variant="outlined" label={chip} />
          ))}
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{entry.when}</Typography>
      </Stack>
      {entry.lines.map((line) => (
        <Typography key={line.label} variant="caption" component="div" sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
          {line.label}: {line.value}
        </Typography>
      ))}
    </Stack>
  );
}

/**
 * One log the traced id was looked up in, with how many times it appears. A
 * log with no entry still shows, saying so, so Finance knows it was checked.
 */
export default function TraceSection({ title, entries, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DetailCard title={t('finance.paymentTrace.sectionCount', { vars: { title, count: entries.length } })} testId={testId}>
      {entries.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('finance.paymentTrace.notInLog')}</Typography>
      ) : (
        <Box>
          <Stack spacing={1.25} divider={<Divider flexItem />}>
            {entries.map((entry) => (
              <EntryRow key={entry.key} entry={entry} />
            ))}
          </Stack>
        </Box>
      )}
    </DetailCard>
  );
}
