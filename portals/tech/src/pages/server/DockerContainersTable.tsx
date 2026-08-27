import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatDateTime } from './format';
import type { DockerContainer } from './queries';
import { useTranslation } from '@duncit/app-settings';

/** Docker container lifecycle states (fixed by the Docker Engine API). */
type Translate = ReturnType<typeof useTranslation>['t'];

const stateOptions = (t: Translate) => [
  { value: 'running', label: t('tech.server.running') },
  { value: 'exited', label: t('tech.server.exited') },
  { value: 'created', label: t('shell.common.created') },
  { value: 'restarting', label: t('tech.server.restarting') },
  { value: 'paused', label: t('tech.server.paused') },
  { value: 'dead', label: t('tech.server.dead') },
] as const;

const getContainerRowId = (c: DockerContainer) => c.id;

const renderName = (c: DockerContainer) => (
  <Typography variant="body2" sx={{
    fontWeight: 600
  }}>
    {c.name || c.id}
  </Typography>
);
const nameValue = (c: DockerContainer) => c.name || c.id;

const renderImage = (c: DockerContainer) => (
  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
    {c.image}
  </Typography>
);

const renderState = (c: DockerContainer) => (
  <Chip size="small" color={c.state === 'running' ? 'success' : 'default'} label={c.state} />
);

const createdValue = (c: DockerContainer) => formatDateTime(c.createdAt);

const buildColumns = (t: Translate): DuncitColumn<DockerContainer>[] => [
  {
    field: 'name',
    headerName: t('shell.common.name'),
    flex: 1,
    minWidth: 180,
    filter: { type: 'text' },
    cellRenderer: renderName,
    valueGetter: nameValue,
  },
  {
    field: 'image',
    headerName: t('tech.server.image'),
    flex: 1.4,
    minWidth: 220,
    filter: { type: 'text' },
    cellRenderer: renderImage,
  },
  {
    field: 'state',
    headerName: t('tech.server.state'),
    width: 130,
    filter: { type: 'select', options: stateOptions(t) },
    cellRenderer: renderState,
  },
  { field: 'status', headerName: t('shell.common.status'), flex: 1, minWidth: 160 },
  {
    field: 'createdAt',
    headerName: t('shell.common.created'),
    width: 180,
    filter: { type: 'date' },
    valueGetter: createdValue,
  },
];

/** Per-row Restart action. */
function RestartCell({
  container,
  onRestart,
}: Readonly<{ container: DockerContainer; onRestart: (name: string) => void }>) {
  return (
    <DuncitButton
      size="small"
      variant="outlined"
      color="warning"
      startIcon={<RestartAltIcon fontSize="small" />}
      onClick={() => onRestart(container.name || container.id)}
      sx={{ whiteSpace: 'nowrap' }}
    >
      Restart
    </DuncitButton>
  );
}

/** The action column, built at module scope so the cell renderer is never a
 * component defined inside a component. */
const actionsColumn = (onRestart: (name: string) => void): DuncitColumn<DockerContainer> => ({
  field: 'actions',
  headerName: '',
  sortable: false,
  width: 130,
  valueGetter: (c) => c.state,
  cellRenderer: (c: DockerContainer) => <RestartCell container={c} onRestart={onRestart} />,
});

interface Props {
  fetchRows: TableFetch<DockerContainer>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onRestart: (name: string) => void;
}

/** Server-paged table over the host's Docker containers, with a per-row Restart
 * action. The action column carries a `valueGetter` on the container state so
 * AG Grid re-renders the cell after a restart (renderer-only columns otherwise
 * freeze on stale rows). */
export default function DockerContainersTable({
  fetchRows,
  refetchRef,
  onRestart,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<DockerContainer>[]>(
    () => [...buildColumns(t), actionsColumn(onRestart)],
    [t, onRestart],
  );

  return (
    <DuncitTable<DockerContainer>
      tableId="tech-docker-containers"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getContainerRowId}
      emptyText={t('tech.server.noContainersFound')}
      defaultSort={{ field: 'name', dir: 'asc' }}
      searchPlaceholder="Search name, image or ID"
      refetchRef={refetchRef}
    />
  );
}
