import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitTable, clientTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import GlobalSwitchCard from './GlobalSwitchCard';
import MediaDialog from './MediaDialog';
import { getScenarioColumns } from './scenarioColumns';
import {
  boardIsHealthy,
  GLOBAL_EVENT_KEY,
  needsDefaultMedia,
  scenarioSearchText,
} from './helpers';
import { useWhatsappBoard } from './useWhatsappBoard';
import type { WaScenario } from './queries';

const getRowId = (row: WaScenario) => row.event_key;
const EMPTY_ROWS: WaScenario[] = [];

/**
 * Every message the platform sends on its own, joined against AiSensy, with the
 * switch that stops it.
 *
 * It sits beside Campaigns rather than in another portal because the two are
 * the same question asked twice — what may go out on WhatsApp — and the record
 * of what actually went out is one tab over, for both of them.
 *
 * The board arrives whole, so the table pages and searches it in memory rather
 * than asking the server to rebuild that join per page.
 */
export default function WaAutomation() {
  const { t } = useTranslation();
  const {
    board,
    loading,
    loadFailed,
    busyKey,
    reconciling,
    savingMedia,
    toggle,
    saveMedia,
    runReconcile,
  } = useWhatsappBoard();
  const [mediaFor, setMediaFor] = useState<WaScenario | null>(null);

  // The dialog closes only once the write stuck — a failed save keeps what was
  // typed on screen so it can be corrected rather than retyped.
  const handleSaveMedia = useCallback(
    async (eventKey: string, url: string, filename: string) => {
      if (await saveMedia(eventKey, url, filename)) setMediaFor(null);
    },
    [saveMedia]
  );

  const rows = board?.rows ?? EMPTY_ROWS;
  const defaultMediaUrl = board?.default_media_url ?? '';
  const columns = useMemo(
    () =>
      getScenarioColumns({
        t,
        busyKey,
        onToggle: toggle,
        onSetMedia: setMediaFor,
        defaultMediaUrl,
      }),
    [t, busyKey, toggle, defaultMediaUrl]
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
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {t('adminWhatsapp.subtitle')}
      </Typography>

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
      {/* One banner for what is otherwise 52 identical blockers. */}
      {board && needsDefaultMedia(rows, defaultMediaUrl) && (
        <Alert severity="warning">{t('adminWhatsapp.defaultMediaMissing')}</Alert>
      )}
      {boardIsHealthy(rows, board?.catalogue_ok ?? false) && (
        <Alert severity="success">{t('adminWhatsapp.healthy')}</Alert>
      )}

      <DuncitTable<WaScenario>
        tableId="wa-automation-scenarios"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('adminWhatsapp.scenariosEmpty')}
        searchPlaceholder={t('adminWhatsapp.scenariosSearch')}
        refetchRef={refetchRef}
      />

      <MediaDialog
        scenario={mediaFor}
        saving={savingMedia}
        onClose={() => setMediaFor(null)}
        onSave={handleSaveMedia}
      />
    </Stack>
  );
}
