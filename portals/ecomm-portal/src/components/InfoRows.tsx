import type { ReactNode } from 'react';
import { Stack } from '@mui/material';
import { InfoRow, type InfoRowVariant } from '@duncit/ui';

/** One label/value line of a detail panel. */
export interface InfoLine {
  key: string;
  label: string;
  value: ReactNode;
  /** A total — drawn heavier. */
  bold?: boolean;
}

interface InfoRowsProps {
  lines: readonly InfoLine[];
  variant?: InfoRowVariant;
}

/** A detail panel's label/value lines, in the shared row shape. */
export default function InfoRows({ lines, variant = 'split' }: Readonly<InfoRowsProps>) {
  return (
    <Stack spacing={0.75}>
      {lines.map((line) => (
        <InfoRow key={line.key} variant={variant} label={line.label} value={line.value} bold={line.bold} />
      ))}
    </Stack>
  );
}
