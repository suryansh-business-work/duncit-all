import { useEffect, useMemo, useRef } from 'react';
import { Alert, Stack } from '@mui/material';
import { DuncitTable, clientTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import GlobalSwitchCard from './GlobalSwitchCard';
import { getScenarioColumns } from './scenarioColumns';
import { boardIsHealthy, GLOBAL_EVENT_KEY, scenarioSearchText } from './helpers';
import { useWhatsappBoard } from './useWhatsappBoard';
import type { WaScenario } from './queries';

const getRowId = (row: WaScenario) => row.event_key;
const EMPTY_ROWS: WaScenario[] = [];

/**
 * Every automatic message, joined against AiSensy. The board arrives whole, so
 * the table pages and searches it in memory rather than asking the server to
 * rebuild that join per page.
 */
export default function ScenariosTab() {
  const { t } = useTranslation();
  const { board, loading, loadFailed, busyKey, reconciling, toggle, runReconcile } =
    useWhatsappBoard();

  const rows = board?.rows ?? EMPTY_ROWS;
  const columns = useMemo(
    () => getScenarioColumns({ t, busyKey, onToggle: toggle }),
    [t, busyKey, toggle]
  );
  const fetchRows = useMemo(() => clientTableFetch(rows, scenarioSearchText), [rows]);

  // The table only re-reads when its own query changes, so a board that came
  // back from a toggle has to ask for the re-read — otherwise the switch snaps
  // back to the list the table first mounted with.
  const refetchRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  const globalEnabled = board?.global_enabled ?? false;
  // AiSensy's own words about why it could not be read — data, not copy.
  const catalogueError = board?.catalogue_ok === false ? board.catalogue_error : '';

  return (
    <Stack spacing={2}>
      <GlobalSwitchCard
        enabled={globalEnabled}
        busy={loading || busyKey === GLOBAL_EVENT_KEY}
        reconciling={loading || reconciling}
        onToggle={(next) => toggle(GLOBAL_EVENT_KEY, next)}
        onReconcile={runReconcile}
      />

      {loadFailed && <Alert severity="error">{t('adminWhatsapp.loadFailed')}</Alert>}
      {/* Only once the board has answered — otherwise the first paint accuses
          a live setup of being switched off. */}
      {board && !globalEnabled && (
        <Alert severity="warning">{t('adminWhatsapp.globalOffWarning')}</Alert>
      )}
      {board?.catalogue_ok === false && (
        <Alert severity="warning">
          {t('adminWhatsapp.catalogueUnreachable')}
          {catalogueError && ` ${catalogueError}`}
        </Alert>
      )}
      {boardIsHealthy(rows) && <Alert severity="success">{t('adminWhatsapp.healthy')}</Alert>}

      <DuncitTable<WaScenario>
        tableId="admin-whatsapp-scenarios"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('adminWhatsapp.scenariosEmpty')}
        searchPlaceholder={t('adminWhatsapp.scenariosSearch')}
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
