import { Dialog, DialogContent, DialogTitle, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from '@duncit/shell';
import type { EmployeeTargetRecord } from '@duncit/utils';
import { AssignTargetForm, type AssignTargetOutput } from './assign-target';

interface Props {
  open: boolean;
  /** The target whose goals are being edited, or null to assign a new one. */
  editing: EmployeeTargetRecord | null;
  onSubmit: (values: AssignTargetOutput) => Promise<boolean>;
  onClose: () => void;
}

/** The Assign / Edit goals form, in a dialog over the list. */
export default function AssignTargetDialog({ open, editing, onSubmit, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen} aria-labelledby="assign-target-title">
      <DialogTitle id="assign-target-title">
        {editing ? t('employeeTargets.form.editTitle') : t('employeeTargets.form.assignTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <AssignTargetForm editing={editing} onSubmit={onSubmit} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
