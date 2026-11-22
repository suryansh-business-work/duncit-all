import type { ReactNode } from 'react';
import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';

/** One label/value line; an empty value reads as a dash rather than a blank. */
export interface DetailLine {
  label: string;
  value: ReactNode;
}

interface Props {
  title: string;
  lines?: readonly DetailLine[];
  children?: ReactNode;
  testId?: string;
}

const shown = (value: ReactNode) => (value === null || value === undefined || value === '' ? EM_DASH : value);

/** A titled outlined card of label/value lines — every section of the case page uses one. */
export default function DetailCard({ title, lines = [], children, testId }: Readonly<Props>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 280, width: '100%' }} data-testid={testId}>
      <CardContent>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          {title}
        </Typography>
        {lines.length > 0 && (
          <Stack spacing={1} divider={<Divider flexItem />}>
            {lines.map((line) => (
              <InfoRow key={line.label} variant="split" label={line.label} value={shown(line.value)} />
            ))}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
