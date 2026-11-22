import { useCallback, useRef } from 'react';
import { Box, Stack } from '@mui/material';
import { PageHeader, SectionCard } from '@duncit/ui';
import { useUserData } from '@duncit/user-context';
import { useTranslation } from '@duncit/shell';
import type { SavedCalculation } from '../../lib/queries';
import { GrowthInputsForm } from './growth-inputs';
import GrowthResults from './results/GrowthResults';
import { SaveCalculationForm } from './save-calculation';
import SavedCalculationsTable from './saved/SavedCalculationsTable';
import CalculationDetailDialog from './saved/CalculationDetailDialog';
import { useCalculationActions } from './saved/useCalculationActions';
import { useGrowthCalculator } from './useGrowthCalculator';
import { useSaveCalculation } from './useSaveCalculation';

/**
 * The Growth Calculator: assumptions on the left, every target they imply on
 * the right (recalculated as you type), a Save card to keep a run, and the
 * saved runs below — each one viewable, editable, duplicable and deletable.
 */
export default function GrowthCalculatorPage() {
  const { t } = useTranslation();
  const { user } = useUserData();
  const state = useGrowthCalculator();
  const { refetchRef, startEdit } = state;
  const topRef = useRef<HTMLDivElement>(null);
  const save = useSaveCalculation({ inputs: state.inputs, editing: state.editing, onSaved: state.onSaved });
  const refetch = useCallback(() => refetchRef.current?.(), [refetchRef]);
  const { duplicate, remove } = useCalculationActions(refetch);

  const calculatedBy = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || '';

  const edit = useCallback(
    (row: SavedCalculation) => {
      startEdit(row);
      topRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    },
    [startEdit]
  );

  return (
    <Stack spacing={3} ref={topRef}>
      <PageHeader title={t('targets.growth.title')} subtitle={t('targets.growth.intro')} />
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(280px, 340px) 1fr' }, alignItems: 'start' }}>
        <SectionCard title={t('targets.growth.inputs.title')}>
          <GrowthInputsForm seed={state.seed} onChange={state.onInputs} onReset={state.resetInputs} />
        </SectionCard>
        <GrowthResults outputs={state.outputs} stale={state.stale} />
      </Box>
      <SectionCard title={state.editing ? t('targets.growth.save.editTitle') : t('targets.growth.save.title')}>
        <SaveCalculationForm
          editing={state.editing}
          canSave={state.inputs !== null}
          calculatedBy={calculatedBy}
          onSubmit={save}
          onCancelEdit={state.cancelEdit}
        />
      </SectionCard>
      <SectionCard title={t('targets.growth.saved.title')}>
        <SavedCalculationsTable
          refetchRef={refetchRef}
          onView={state.setViewing}
          onEdit={edit}
          onDuplicate={duplicate}
          onDelete={remove}
        />
      </SectionCard>
      <CalculationDetailDialog calculation={state.viewing} onClose={() => state.setViewing(null)} />
    </Stack>
  );
}
