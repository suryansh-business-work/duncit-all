import { useMutation } from '@apollo/client/react';
import { Box, Stack, TextField } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import PodInputsCard from '../PodInputsCard';
import VenueHostCard from '../VenueHostCard';
import ResultsCard from '../ResultsCard';
import ReportActions from '../saved/ReportActions';
import { calculatePodProfit } from '../calculate';
import { CREATE_POD_CALCULATOR, DELETE_POD_CALCULATOR, UPDATE_POD_CALCULATOR } from '../saved/queries';
import type { SavedPodCalculator } from '../saved/types';
import { useSingleCalculator } from './useSingleCalculator';

interface Props {
  /** The saved calculation loaded into the calculator, or null for a scratch pad. */
  saved: SavedPodCalculator | null;
  onOpen: (id: string | null) => void;
  onSaved: () => void;
}

/**
 * The single-pod calculator, plus what it takes to keep one.
 *
 * The calculator is always on screen: its main use is a quick estimate that
 * nobody wants to save, so saving is an action on top rather than a step in
 * front. Naming it and pressing Save creates a row in the table below; opening
 * a row loads it back here.
 */
export default function SingleCalculatorPanel({ saved, onOpen, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const calc = useSingleCalculator(saved, t('finance.common.pod'));
  const results = calculatePodProfit(calc.inputs);

  const [create, createState] = useMutation<any>(CREATE_POD_CALCULATOR);
  const [update, updateState] = useMutation<any>(UPDATE_POD_CALCULATOR);
  const [remove, removeState] = useMutation<any>(DELETE_POD_CALCULATOR);

  const trimmedName = calc.name.trim();
  const busy = createState.loading || updateState.loading || removeState.loading;
  const input = { name: trimmedName, kind: 'SINGLE', pods: calc.payload };

  const onSave = () => {
    const run = saved
      ? update({ variables: { calculator_doc_id: saved.id, input } })
      : create({ variables: { input } });
    run
      .then((res: any) => {
        notifySuccess(t('finance.calculators.calculationSaved'));
        onSaved();
        const created = res.data?.createPodCalculator;
        if (created?.id) onOpen(created.id);
        return undefined;
      })
      .catch((error: Error) => notifyError(error.message));
  };

  const onDelete = () => {
    if (!saved) return;
    confirm({
      title: t('finance.calculators.deleteCalculationTitle'),
      message: t('finance.calculators.deleteCalculationBody'),
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    })
      .then((ok) => {
        if (!ok) return undefined;
        return remove({ variables: { calculator_doc_id: saved.id } })
          .then(() => {
            notifySuccess(t('finance.calculators.calculationDeleted'));
            onOpen(null);
            onSaved();
            return undefined;
          })
          .catch((error: Error) => notifyError(error.message));
      })
      .catch(() => undefined);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          label={t('finance.calculators.calculationName')}
          size="small"
          value={calc.name}
          onChange={(e) => calc.setName(e.target.value)}
          placeholder={t('finance.calculators.nameToSaveHint')}
          sx={{ flex: 1, minWidth: 220 }}
        />
        {saved && (
          <DuncitButton size="small" startIcon={<NoteAddOutlinedIcon />} onClick={() => onOpen(null)}>
            {t('finance.calculators.newCalculation')}
          </DuncitButton>
        )}
        <DuncitButton size="small" startIcon={<RestartAltIcon />} onClick={calc.reset}>
          {t('finance.calculators.reset')}
        </DuncitButton>
        {saved && (
          <DuncitButton
            size="small"
            color="error"
            startIcon={<DeleteOutlinedIcon />}
            onClick={onDelete}
            disabled={busy}
          >
            {t('shell.common.delete')}
          </DuncitButton>
        )}
        <DuncitButton
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          onClick={onSave}
          disabled={busy || !trimmedName || !calc.dirty}
        >
          {busy ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </Stack>

      {saved && (
        <ReportActions calculatorId={saved.id} calculatorName={saved.name} disabled={calc.dirty} />
      )}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <PodInputsCard inputs={calc.inputs} onChange={calc.setInput} />
          <VenueHostCard inputs={calc.inputs} onChange={calc.setInput} />
        </Stack>
        <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0 }}>
          <ResultsCard results={results} />
        </Box>
      </Stack>
    </Stack>
  );
}
