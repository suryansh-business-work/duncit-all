import { useMemo, useState } from 'react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { TableQuerySnapshot } from '@duncit/table';
import DeleteDateWindow, {
  EMPTY_WINDOW,
  windowIsInverted,
  windowToScope,
  type DeleteWindow,
} from './DeleteDateWindow';
import { scopeFromView, scopeIsEverything, type TelemetryDeleteTarget } from './queries';
import { useRunTelemetryDelete, useTelemetryDeleteCount } from './useTelemetryDelete';

const TITLE_KEY: Record<TelemetryDeleteTarget, string> = {
  LOGS: 'tech.telemetryDelete.titleLogs',
  BUGS: 'tech.telemetryDelete.titleBugs',
};

interface Props {
  open: boolean;
  onClose: () => void;
  target: TelemetryDeleteTarget;
  /** What the table is showing — the filters a delete from here inherits. */
  view: TableQuerySnapshot;
  /** False hides the button for a scope only a Super Admin may run. */
  canDeleteEverything: boolean;
  onDeleted: () => void;
}

/**
 * Delete by what the table is showing, optionally narrowed to a date window.
 *
 * The dialog IS the confirmation: it names the exact scope, counts the rows in
 * range against the server before the button is live, and turns red when
 * nothing is narrowing it. A second confirm on top of that would add a click
 * without adding a fact.
 */
export default function TelemetryDeleteDialog(props: Readonly<Props>) {
  const { open, onClose, target, view, canDeleteEverything, onDeleted } = props;
  const { t } = useTranslation();
  const [window, setWindow] = useState<DeleteWindow>(EMPTY_WINDOW);

  const scope = useMemo(() => scopeFromView(view, windowToScope(window)), [view, window]);
  const everything = scopeIsEverything(scope);
  const inverted = windowIsInverted(window);

  const { count, loading: counting, error: countError } = useTelemetryDeleteCount(
    target,
    scope,
    !open || inverted,
  );
  const { run, running } = useRunTelemetryDelete(target, () => {
    setWindow(EMPTY_WINDOW);
    onClose();
    onDeleted();
  });

  const blockedByRole = everything && !canDeleteEverything;
  const canRun = !counting && !running && !inverted && !countError && count > 0 && !blockedByRole;

  return (
    <Dialog open={open} onClose={running ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t(TITLE_KEY[target])}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {everything
              ? t('tech.telemetryDelete.scopeEverything')
              : t('tech.telemetryDelete.scopeFiltered')}
          </Typography>

          <DeleteDateWindow value={window} onChange={setWindow} disabled={running} />

          <DeleteCountLine
            counting={counting}
            failed={Boolean(countError)}
            inverted={inverted}
            count={count}
          />

          {everything ? (
            <Alert severity="error">{t('tech.telemetryDelete.everythingWarning')}</Alert>
          ) : null}
          {blockedByRole ? (
            <Alert severity="info">{t('tech.telemetryDelete.everythingRoleNote')}</Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={running}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          color="error"
          variant="contained"
          startIcon={<DeleteSweepIcon />}
          disabled={!canRun}
          onClick={() => run({ ...scope })}
        >
          {t('tech.telemetryDelete.deleteAction', { count })}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}

interface CountLineProps {
  counting: boolean;
  failed: boolean;
  inverted: boolean;
  count: number;
}

/**
 * The one number the whole dialog exists to show, and the three reasons it may
 * not be there yet. Hoisted to module scope so it is a component rather than a
 * nested definition, and so the branch reads as four cases instead of a chain.
 */
function DeleteCountLine({ counting, failed, inverted, count }: Readonly<CountLineProps>) {
  const { t } = useTranslation();
  if (inverted) return null;
  if (failed) return <Alert severity="error">{t('tech.telemetryDelete.countFailed')}</Alert>;
  if (counting) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <CircularProgress size={16} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.telemetryDelete.counting')}
        </Typography>
      </Stack>
    );
  }
  if (count === 0)
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('tech.telemetryDelete.willDeleteNone')}
      </Typography>
    );
  return (
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {t('tech.telemetryDelete.willDelete', { count })}
    </Typography>
  );
}
