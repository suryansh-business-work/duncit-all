import type { ReactNode } from 'react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { ConfirmDialog } from '@duncit/dialogs';
import 'gridstack/dist/gridstack.min.css';
import { DASHBOARD_FALLBACK_FLAT } from './i18n';
import { DashboardGrid } from './DashboardGrid';
import { DashboardToolbar } from './DashboardToolbar';
import { useDashboardController } from './useDashboardController';
import type { DashboardWidget } from './types';

export type DuncitDashboardProps = Readonly<{
  /**
   * Stable key this dashboard's layouts are stored under, namespaced by portal
   * — e.g. `admin.overview`, `finance.startup`. Changing it orphans every saved
   * arrangement, so treat it like a database column name.
   */
  dashboardId: string;
  /** The panels, in the order they read top to bottom by default. */
  widgets: readonly DashboardWidget[];
  /** Page title block, rendered above the toolbar and never draggable. */
  header?: ReactNode;
  /** Row height in px. Raise it for dashboards built from tall charts. */
  cellHeight?: number;
}>;

/**
 * The dashboard every Duncit console renders.
 *
 * A dashboard declares WHAT it shows — an array of widgets with a default slot
 * and a minimum size — and this owns everything about WHERE: the responsive
 * twelve-column grid, drag and resize behind an explicit edit mode, and the
 * per-user layout that is saved server-side so it follows the person from one
 * machine to the next rather than living in one browser.
 */
export function DuncitDashboard({ dashboardId, widgets, header, cellHeight }: DuncitDashboardProps) {
  const { t } = useTranslation(DASHBOARD_FALLBACK_FLAT);

  const controller = useDashboardController(
    dashboardId,
    widgets,
    {
      saveFailed: t('shell.dashboard.saveFailed'),
      resetFailed: t('shell.dashboard.resetFailed'),
      loadFailed: t('shell.dashboard.loadFailed'),
    },
    cellHeight
  );

  return (
    <Stack spacing={2}>
      {header}

      <DashboardToolbar
        editing={controller.editing}
        saving={controller.saving}
        dirty={controller.dirty}
        labels={{
          customise: t('shell.dashboard.customise'),
          editing: t('shell.dashboard.editing'),
          hint: t('shell.dashboard.customiseHint'),
          save: t('shell.dashboard.save'),
          saving: t('shell.dashboard.saving'),
          cancel: t('shell.dashboard.cancel'),
          reset: t('shell.dashboard.reset'),
        }}
        onStart={controller.startEditing}
        onSave={controller.saveLayout}
        onCancel={controller.cancelEditing}
        onReset={controller.askReset}
      />

      {controller.error ? <Alert severity="warning">{controller.error}</Alert> : null}

      <DashboardGrid
        widgets={widgets}
        layout={controller.layout}
        editing={controller.editing}
        dragLabel={t('shell.dashboard.dragHandle')}
        containerRef={controller.containerRef}
      />

      <ConfirmDialog
        open={controller.confirmingReset}
        title={t('shell.dashboard.resetTitle')}
        message={t('shell.dashboard.resetBody')}
        confirmLabel={t('shell.dashboard.resetConfirm')}
        cancelLabel={t('shell.dashboard.cancel')}
        destructive
        onClose={controller.closeReset}
        onConfirm={controller.confirmReset}
      />
    </Stack>
  );
}
