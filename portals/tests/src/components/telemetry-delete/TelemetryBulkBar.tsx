import { useState } from 'react';
import { Link, Paper, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import type { TableQuerySnapshot } from '@duncit/table';
import { scopeFromView, type TelemetryDeleteTarget } from './queries';
import { useRunTelemetryDelete } from './useTelemetryDelete';

interface Props {
  target: TelemetryDeleteTarget;
  /** Ids ticked on the page on screen — never a total carried across pages. */
  selectedIds: string[];
  /** Null until the table's first fetch has answered. */
  view: TableQuerySnapshot | null;
  onClear: () => void;
  onDeleted: () => void;
}

/**
 * The selection bar, with the one escalation the grid itself cannot offer.
 *
 * AG Grid's client-side model only ever holds the rows the server returned for
 * this page, so its header checkbox is "select this page" however it is worded.
 * The rest of the matching set has no rows to tick — the only honest way to
 * select it is to say so and act on the QUERY instead, which is what the
 * "select all matching" link switches this bar to.
 */
export default function TelemetryBulkBar(props: Readonly<Props>) {
  const { target, selectedIds, view, onClear, onDeleted } = props;
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [allMatching, setAllMatching] = useState(false);

  const clearAll = () => {
    setAllMatching(false);
    onClear();
  };
  const { run, running } = useRunTelemetryDelete(target, () => {
    setAllMatching(false);
    onDeleted();
  });

  /*
   * An escalation survives paging but never a change to the SET.
   *
   * The key is the search and the filters alone: turning a page or re-sorting
   * leaves "all matching" meaning exactly what it did, but editing a filter
   * makes it cover different rows — and a bar that kept claiming the old count
   * would delete a set nobody chose. Sync-during-render, like useTableQuery's
   * own external-filter reset.
   */
  const viewKey = JSON.stringify({ s: view?.query.search ?? '', f: view?.query.filters ?? [] });
  const [prevViewKey, setPrevViewKey] = useState(viewKey);
  if (prevViewKey !== viewKey) {
    setPrevViewKey(viewKey);
    setAllMatching(false);
  }

  const pageCount = selectedIds.length;
  if (!view || (pageCount === 0 && !allMatching)) return null;

  const removeSelected = async () => {
    const ok = await confirm({
      title: t('tech.telemetryDelete.confirmSelectedTitle'),
      message: t('tech.telemetryDelete.confirmSelectedBody', { count: pageCount }),
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    });
    if (ok) await run({ ids: selectedIds });
  };

  const removeAllMatching = async () => {
    const ok = await confirm({
      title: t('tech.telemetryDelete.confirmAllTitle'),
      message: t('tech.telemetryDelete.confirmAllBody', { count: view.total }),
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    });
    if (ok) await run(scopeFromView(view));
  };

  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'center' } }}
      >
        <Stack sx={{ flex: 1 }}>
          <Typography variant="body2">
            {allMatching
              ? t('tech.telemetryDelete.allMatchingSelected', { count: view.total })
              : t('tech.telemetryDelete.selectedOnThisPage', { count: pageCount })}
          </Typography>
          {!allMatching && view.total > pageCount ? (
            <Link component="button" type="button" variant="body2" onClick={() => setAllMatching(true)}>
              {t('tech.telemetryDelete.selectAllMatching', { count: view.total })}
            </Link>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1}>
          <DuncitButton size="small" onClick={clearAll} disabled={running}>
            {t('shell.common.clear')}
          </DuncitButton>
          <DuncitButton
            size="small"
            color="error"
            variant="contained"
            startIcon={<DeleteOutlineIcon />}
            onClick={allMatching ? removeAllMatching : removeSelected}
            disabled={running}
          >
            {t('shell.common.delete')}
          </DuncitButton>
        </Stack>
      </Stack>
    </Paper>
  );
}
