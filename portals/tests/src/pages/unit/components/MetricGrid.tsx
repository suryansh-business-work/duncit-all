import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { StatCard } from '@duncit/ui';

export interface Metric {
  id: string;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** 0–100 draws a bar under the value — in the primary colour, because more coverage is better, not fuller. */
  percent?: number;
  /** Theme colour path for the value, e.g. `error.main`. */
  valueColor?: string;
}

/** A wrapping grid of stat cards: two across on a phone, up to six on a wide screen. */
export default function MetricGrid({ metrics }: Readonly<{ metrics: readonly Metric[] }>) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(6, minmax(0, 1fr))',
        },
      }}
    >
      {metrics.map((metric) => (
        <StatCard
          key={metric.id}
          label={metric.label}
          value={metric.value}
          hint={metric.hint}
          percent={metric.percent}
          progressColor={metric.percent === undefined ? undefined : 'primary'}
          valueColor={metric.valueColor}
          valueVariant="h6"
        />
      ))}
    </Box>
  );
}
