import { useMutation } from '@apollo/client/react';
import { Alert, Box, Stack, TextField } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import MultiPodAccordion from './MultiPodAccordion';
import TotalsCard from '../saved/TotalsCard';
import ReportActions from '../saved/ReportActions';
import { useMultiPodEditor } from './useMultiPodEditor';
import { DELETE_POD_CALCULATOR, UPDATE_POD_CALCULATOR } from '../saved/queries';
import { podPayload, type SavedPodCalculator } from '../saved/types';

interface Props {
  saved: SavedPodCalculator;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * One saved comparison, open for editing.
 *
 * `saved` is passed by key from the list, so opening a different comparison
 * remounts this component and the editor hook seeds itself from the new row —
 * no effect syncing props into state, and no chance of showing one comparison's
 * pods under another's name.
 */
export default function MultiPodEditor({ saved, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const editor = useMultiPodEditor(saved, t('finance.common.pod'));
  const [save, saveState] = useMutation<any>(UPDATE_POD_CALCULATOR);
  const [remove, removeState] = useMutation<any>(DELETE_POD_CALCULATOR);

  const trimmedName = editor.name.trim();
  const busy = saveState.loading || removeState.loading;

  const onSave = () => {
    save({
      variables: {
        calculator_doc_id: saved.id,
        input: { name: trimmedName, pods: podPayload(editor.entries) },
      },
    })
      .then(() => {
        notifySuccess(t('finance.calculators.comparisonSaved'));
        onSaved();
        return undefined;
      })
      .catch((error: Error) => notifyError(error.message));
  };

  // Leaving with unsaved edits throws them away, so it asks first. A clean
  // editor closes straight away — a confirmation nobody ever needs is one
  // people learn to click through.
  const onBack = () => {
    if (!editor.dirty) {
      onClose();
      return;
    }
    confirm({
      title: t('finance.calculators.discardChangesTitle'),
      message: t('finance.calculators.discardChangesBody'),
      confirmLabel: t('finance.calculators.discardChanges'),
      destructive: true,
    })
      .then((ok) => {
        if (ok) onClose();
        return undefined;
      })
      .catch(() => undefined);
  };

  const onDelete = () => {
    confirm({
      title: t('finance.calculators.deleteComparisonTitle'),
      message: t('finance.calculators.deleteComparisonBody'),
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    })
      .then((ok) => {
        if (!ok) return undefined;
        return remove({ variables: { calculator_doc_id: saved.id } })
          .then(() => {
            notifySuccess(t('finance.calculators.comparisonDeleted'));
            onClose();
            return undefined;
          })
          .catch((error: Error) => notifyError(error.message));
      })
      .catch(() => undefined);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <DuncitButton size="small" startIcon={<ArrowBackIcon />} onClick={onBack}>
          {t('finance.calculators.backToComparisons')}
        </DuncitButton>
        <Box sx={{ flex: 1 }} />
        <ReportActions
          calculatorId={saved.id}
          calculatorName={saved.name}
          disabled={editor.dirty}
        />
        <DuncitButton
          size="small"
          color="error"
          startIcon={<DeleteOutlinedIcon />}
          onClick={onDelete}
          disabled={busy}
        >
          {removeState.loading ? t('shell.common.deleting') : t('shell.common.delete')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          onClick={onSave}
          disabled={busy || !trimmedName || !editor.dirty}
        >
          {saveState.loading ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </Stack>

      <TextField
        label={t('finance.calculators.calculatorName')}
        size="small"
        value={editor.name}
        onChange={(e) => editor.setName(e.target.value)}
        error={!trimmedName}
        helperText={trimmedName ? ' ' : t('finance.calculators.nameRequired')}
        fullWidth
      />

      {editor.rows.length === 0 && (
        <Alert severity="info">{t('finance.calculators.noPodsAdded')}</Alert>
      )}

      <Box>
        {editor.rows.map((row) => (
          <MultiPodAccordion
            key={row.pod_key}
            row={row}
            expanded={editor.expandedKeys.has(row.pod_key)}
            onToggle={() => editor.toggleExpanded(row.pod_key)}
            onRename={(name) => editor.renamePod(row.pod_key, name)}
            onInputChange={(key, value) => editor.setInput(row.pod_key, key, value)}
            onRemove={() => editor.removePod(row.pod_key)}
          />
        ))}
      </Box>

      <Box>
        <DuncitButton variant="outlined" size="small" startIcon={<AddIcon />} onClick={editor.addPod}>
          {t('finance.calculators.addPod')}
        </DuncitButton>
      </Box>

      <TotalsCard totals={editor.totals} />
    </Stack>
  );
}
