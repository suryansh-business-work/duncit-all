import type { MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatDateTime } from './format';
import type { DockerContainer } from './queries';

/** Docker container lifecycle states (fixed by the Docker Engine API). */
const STATE_OPTIONS = [
  { value: 'running', label: 'Running' },
  { value: 'exited', label: 'Exited' },
  { value: 'created', label: 'Created' },
  { value: 'restarting', label: 'Restarting' },
  { value: 'paused', label: 'Paused' },
  { value: 'dead', label: 'Dead' },
] as const;

const getContainerRowId = (c: DockerContainer) => c.id;

const renderName = (c: DockerContainer) => (
  <Typography variant="body2" fontWeight={600}>{c.name || c.id}</Typography>
);
const nameValue = (c: DockerContainer) => c.name || c.id;

const renderImage = (c: DockerContainer) => (
  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{c.image}</Typography>
);

const renderState = (c: DockerContainer) => (
  <Chip size="small" color={c.state === 'running' ? 'success' : 'default'} label={c.state} />
);

const createdValue = (c: DockerContainer) => formatDateTime(c.createdAt);

const COLUMNS: DuncitColumn<DockerContainer>[] = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 180, filter: { type: 'text' }, cellRenderer: renderName, valueGetter: nameValue },
  { field: 'image', headerName: 'Image', flex: 1.4, minWidth: 220, filter: { type: 'text' }, cellRenderer: renderImage },
  { field: 'state', headerName: 'State', width: 130, filter: { type: 'select', options: STATE_OPTIONS }, cellRenderer: renderState },
  { field: 'status', headerName: 'Status', flex: 1, minWidth: 160 },
  { field: 'createdAt', headerName: 'Created', width: 180, filter: { type: 'date' }, valueGetter: createdValue },
];

interface Props {
  fetchRows: TableFetch<DockerContainer>;
  refetchRef: MutableRefObject<(() => void) | null>;
}

/** Server-paged table over the host's Docker containers (read-only). */
export default function DockerContainersTable({ fetchRows, refetchRef }: Readonly<Props>) {
  return (
    <DuncitTable<DockerContainer>
      tableId="tech-docker-containers"
      columns={COLUMNS}
      fetchRows={fetchRows}
      getRowId={getContainerRowId}
      emptyText="No containers found."
      defaultSort={{ field: 'name', dir: 'asc' }}
      searchPlaceholder="Search name, image or ID"
      refetchRef={refetchRef}
    />
  );
}
