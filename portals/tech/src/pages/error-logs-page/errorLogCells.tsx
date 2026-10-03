import type { MutableRefObject, ReactNode } from 'react';
import { Chip, Typography } from '@mui/material';
import type { TableFetch, TableQuerySnapshot } from '@duncit/table';
import { formatDateTime } from '@duncit/app-settings';
import { ENV_COLOR, UserCell } from '../../components/telemetry-identity';
import type { ErrorLogRow } from './queries';

/**
 * The cells and props the two error tables share — Error Logs and Error
 * Boundaries read the same telemetry rows, so they draw the environment, the
 * message, the person and the time the same way, from one place.
 */

export const getErrorRowId = (row: ErrorLogRow) => row.id;

export const renderEnvironment = (row: ErrorLogRow) => (
  <Chip size="small" label={row.environment} color={ENV_COLOR[row.environment] ?? 'default'} />
);

export const renderMessage = (row: ErrorLogRow) => (
  <Typography variant="body2" noWrap title={row.error?.message ?? ''}>
    {row.error?.message ?? '—'}
  </Typography>
);

export const renderUser = (row: ErrorLogRow) => <UserCell user={row.user} />;

export const renderWhen = (row: ErrorLogRow) => (
  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
    {formatDateTime(row.created_at)}
  </Typography>
);

export interface ErrorLogTableProps {
  fetchRows: TableFetch<ErrorLogRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onOpen: (row: ErrorLogRow) => void;
  /** DuncitTable's checkbox column, for the bulk delete above the table. */
  selection: {
    onChange: (rows: ErrorLogRow[]) => void;
    clearRef: MutableRefObject<(() => void) | null>;
  };
  /**
   * Reports the query behind the rows — WITH the page's pinned marker, so a
   * delete from the page can never reach a log outside its section.
   */
  onQueryChange: (snapshot: TableQuerySnapshot) => void;
  toolbarActions?: ReactNode;
}
