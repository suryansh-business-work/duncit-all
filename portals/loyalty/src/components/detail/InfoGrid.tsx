import type { ReactNode } from 'react';
import { Grid } from '@mui/material';
import { InfoRow } from '@duncit/ui';

export interface InfoItem {
  /** Stable key — also the row's test id suffix. */
  key: string;
  label: string;
  value: ReactNode;
  /** Long values (a message, a reason) take the full row. */
  wide?: boolean;
}

/** Label-over-value facts in a responsive grid: two columns on a phone, three on a desktop. */
export default function InfoGrid({ items }: Readonly<{ items: readonly InfoItem[] }>) {
  return (
    <Grid container spacing={2}>
      {items.map((item) => (
        <Grid key={item.key} size={item.wide ? 12 : { xs: 6, md: 4 }}>
          <InfoRow label={item.label} value={item.value} testId={`info-${item.key}`} />
        </Grid>
      ))}
    </Grid>
  );
}
