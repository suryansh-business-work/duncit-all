import type { ReactNode } from 'react';
import { Typography } from '@mui/material';
import RowGroup from '../../host-manage-page/RowGroup';
import type { PodRequestRowData } from '../queries';
import PodRequestRow from './PodRequestRow';

interface Props {
  requests: readonly PodRequestRowData[];
  /** The list's own empty line. */
  emptyText: string;
  testId: string;
  /** Per-row controls beside the link, e.g. Accept / Decline. */
  renderActions?: (request: PodRequestRowData) => ReactNode;
}

/** A card of Pod Request rows, or its one empty line. */
export default function PodRequestList({ requests, emptyText, testId, renderActions }: Readonly<Props>) {
  if (requests.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }} data-testid={`${testId}-empty`}>
        {emptyText}
      </Typography>
    );
  }
  return (
    <RowGroup testId={testId}>
      {requests.map((request) => (
        <PodRequestRow key={request.id} request={request} actions={renderActions?.(request)} />
      ))}
    </RowGroup>
  );
}
