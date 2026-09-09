import { useState } from 'react';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { TableQuerySnapshot } from '@duncit/table';
import TelemetryDeleteDialog from './TelemetryDeleteDialog';
import type { TelemetryDeleteTarget } from './queries';

interface Props {
  target: TelemetryDeleteTarget;
  /** Null until the table's first fetch has answered — see below. */
  view: TableQuerySnapshot | null;
  canDeleteEverything: boolean;
  onDeleted: () => void;
}

/**
 * The toolbar entry to the filtered / date-window delete.
 *
 * Disabled until the table has reported what it is showing: the dialog's whole
 * claim is that it deletes exactly the rows behind this view, and before the
 * first fetch answers there is no view — only an empty query, which reads as
 * "everything".
 */
export default function TelemetryDeleteButton(props: Readonly<Props>) {
  const { target, view, canDeleteEverything, onDeleted } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <DuncitButton
        size="small"
        color="error"
        startIcon={<DeleteSweepIcon />}
        disabled={view === null}
        onClick={() => setOpen(true)}
      >
        {t('tech.telemetryDelete.openButton')}
      </DuncitButton>
      {view ? (
        <TelemetryDeleteDialog
          open={open}
          onClose={() => setOpen(false)}
          target={target}
          view={view}
          canDeleteEverything={canDeleteEverything}
          onDeleted={onDeleted}
        />
      ) : null}
    </>
  );
}
