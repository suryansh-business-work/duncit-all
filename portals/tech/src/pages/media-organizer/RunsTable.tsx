import { useEffect, useMemo, useRef } from 'react';
import { Stack, Tooltip } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import UndoIcon from '@mui/icons-material/Undo';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import type { OrganizerRun, RelocationStatus } from './queries';

interface Props {
  runs: readonly OrganizerRun[];
  busy: boolean;
  onView: (runId: string) => void;
  onApply: (run: OrganizerRun) => void;
  onRollback: (run: OrganizerRun) => void;
}

const getRowId = (run: OrganizerRun) => run.run_id;

/** One row per organizer run, with what it found and the actions it still allows. */
export default function RunsTable({ runs, busy, onView, onApply, onRollback }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<OrganizerRun>[]>(() => {
    const count = (field: RelocationStatus, headerName: string): DuncitColumn<OrganizerRun> => ({
      field,
      headerName,
      width: 130,
      type: 'number',
      valueGetter: (run) => run[field].toLocaleString(),
    });
    return [
      dateColumn<OrganizerRun>({
        field: 'started_at',
        headerName: t('tech.mediaOrganizer.colStarted'),
        width: 170,
        hide: false,
        getDate: (run) => run.started_at,
      }),
      count('PENDING', t('tech.mediaOrganizer.colPending')),
      count('DONE', t('tech.mediaOrganizer.colDone')),
      count('IN_PLACE', t('tech.mediaOrganizer.colInPlace')),
      count('SHARED', t('tech.mediaOrganizer.colShared')),
      count('FAILED', t('tech.mediaOrganizer.colFailed')),
      count('ROLLED_BACK', t('tech.mediaOrganizer.colRolledBack')),
      {
        field: 'actions',
        headerName: t('tech.mediaOrganizer.colActions'),
        width: 150,
        type: 'actions',
        valueGetter: () => '',
        cellRenderer: (run) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={t('tech.mediaOrganizer.viewFiles')}>
              <span>
                <DuncitIconButton
                  aria-label={t('tech.mediaOrganizer.viewFiles')}
                  data-testid={`media-organizer-view-${run.run_id}`}
                  onClick={() => onView(run.run_id)}
                >
                  <FolderOpenIcon fontSize="small" />
                </DuncitIconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('tech.mediaOrganizer.apply')}>
              <span>
                <DuncitIconButton
                  aria-label={t('tech.mediaOrganizer.apply')}
                  data-testid={`media-organizer-apply-${run.run_id}`}
                  disabled={busy || run.PENDING === 0}
                  onClick={() => onApply(run)}
                >
                  <DriveFileMoveIcon fontSize="small" />
                </DuncitIconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('tech.mediaOrganizer.rollback')}>
              <span>
                <DuncitIconButton
                  aria-label={t('tech.mediaOrganizer.rollback')}
                  data-testid={`media-organizer-rollback-${run.run_id}`}
                  disabled={busy || run.DONE === 0}
                  onClick={() => onRollback(run)}
                >
                  <UndoIcon fontSize="small" />
                </DuncitIconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
    ];
  }, [t, busy, onView, onApply, onRollback]);

  const fetchRows = useMemo(() => clientTableFetch(runs, (run) => run.run_id, columns), [runs, columns]);
  // The grid fetches on query changes only; new counts from a poll have to ask.
  const refetchRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  return (
    <DuncitTable<OrganizerRun>
      ariaLabel={t('tech.mediaOrganizer.runsTitle')}
      tableId="tech-media-organizer-runs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.mediaOrganizer.runsEmpty')}
      defaultSort={{ field: 'started_at', dir: 'desc' }}
      refetchRef={refetchRef}
    />
  );
}
