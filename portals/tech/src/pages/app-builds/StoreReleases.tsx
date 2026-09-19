import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';

/** A release entry's outcome, as a chip. Each store names its own colours and words. */
export const ReleaseStatusChip = ({
  color,
  label,
}: Readonly<{ color: 'info' | 'success' | 'error'; label: string }>) => <Chip size="small" color={color} label={label} />;

/** `by X · when` for a release entry. */
export const releaseWhen = (r: { started_at: string; finished_at: string | null }): string =>
  formatDateTime(r.finished_at ?? r.started_at);

interface Props<R> {
  title: string;
  empty: string;
  releases: R[];
  keyOf: (release: R) => string;
  renderRow: (release: R) => ReactNode;
  testId: string;
}

/** Every push of one build to one store, oldest first — the list; each store draws its own rows. */
export default function StoreReleases<R>({ title, empty, releases, keyOf, renderRow, testId }: Readonly<Props<R>>) {
  return (
    <div data-testid={testId}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {releases.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {empty}
        </Typography>
      )}
      <Stack spacing={1}>
        {releases.map((r) => (
          <Stack key={keyOf(r)} spacing={0.25}>
            {renderRow(r)}
          </Stack>
        ))}
      </Stack>
    </div>
  );
}
