import { useId, type ReactNode } from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';

export interface DetailField {
  /** Stable key, also the row's test id suffix. */
  key: string;
  label: string;
  value: ReactNode;
}

interface Props {
  title: string;
  /** Test id of the section. */
  testId: string;
  /** Rendered at the right end of the heading row (a link, a button). */
  action?: ReactNode;
  /** Shown above the fields (an item's photo and name). */
  lead?: ReactNode;
  /** Label/value pairs, laid out two to a row from small screens up. */
  fields?: DetailField[];
  children?: ReactNode;
}

/**
 * One titled part of the rental detail. A real `<section>` named by its
 * heading, so a screen reader can jump between the parts.
 */
export default function DetailSection({ title, testId, action, lead, fields, children }: Readonly<Props>) {
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId} data-testid={testId}>
      <Divider sx={{ mb: 2 }} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography id={headingId} component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {lead}
      {fields && fields.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {fields.map((field) => (
            <InfoRow key={field.key} label={field.label} value={field.value} testId={`${testId}-${field.key}`} />
          ))}
        </Box>
      )}
      {children}
    </Box>
  );
}
