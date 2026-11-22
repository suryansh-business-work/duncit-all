import { useCallback, useRef, useState } from 'react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { monthKeyOf, type EmployeeTargetRecord } from '@duncit/utils';
import EmployeeTargetsTable from './EmployeeTargetsTable';
import AssignTargetDialog from './AssignTargetDialog';
import TargetDetailDialog from './detail/TargetDetailDialog';
import { useEmployeeTargetActions } from './useEmployeeTargetActions';
import type { AssignTargetOutput } from './assign-target';
import type { ReviewTargetFormValues } from './review-target';

type FormState = { open: boolean; editing: EmployeeTargetRecord | null };
const CLOSED: FormState = { open: false, editing: null };

/**
 * Targets > Employee Targets: assign each employee their goals for a month,
 * then follow what they report — completion, achievements, updates — and
 * review it. One target per employee per month; the server refuses a second.
 */
export default function EmployeeTargetsPage() {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  const refetch = useCallback(() => refetchRef.current?.(), []);
  const actions = useEmployeeTargetActions(refetch);
  const [viewing, setViewing] = useState<EmployeeTargetRecord | null>(null);
  const [form, setForm] = useState<FormState>(CLOSED);
  const [month, setMonth] = useState<Date | null>(null);

  const openEdit = useCallback((row: EmployeeTargetRecord) => {
    setViewing(null);
    setForm({ open: true, editing: row });
  }, []);

  const submitForm = async (values: AssignTargetOutput) => {
    const saved = form.editing ? await actions.update(form.editing, values) : await actions.assign(values);
    if (saved) setForm(CLOSED);
    return saved !== null;
  };

  const review = async (target: EmployeeTargetRecord, values: ReviewTargetFormValues) => {
    const saved = await actions.review(target, values.comment);
    if (saved) setViewing(saved);
    return saved !== null;
  };

  const { reopen: reopenTarget, remove: removeTarget } = actions;
  const reopen = useCallback(
    async (target: EmployeeTargetRecord) => {
      const saved = await reopenTarget(target);
      if (saved) setViewing((current) => (current ? saved : current));
    },
    [reopenTarget]
  );
  const remove = useCallback(
    async (target: EmployeeTargetRecord) => {
      if (await removeTarget(target)) setViewing(null);
    },
    [removeTarget]
  );

  const monthKey = month && !Number.isNaN(month.getTime()) ? monthKeyOf(month) : null;

  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('employeeTargets.admin.title')}
        subtitle={t('employeeTargets.admin.subtitle')}
        actions={
          <DuncitButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setForm({ open: true, editing: null })}
            data-testid="employee-targets-assign"
          >
            {t('employeeTargets.admin.assign')}
          </DuncitButton>
        }
      />
      <SectionCard
        title={t('employeeTargets.admin.listTitle')}
        action={
          <DatePicker
            label={t('employeeTargets.admin.monthFilter')}
            views={['year', 'month']}
            openTo="month"
            value={month}
            onChange={setMonth}
            slotProps={{ textField: { size: 'small' }, field: { clearable: true } }}
          />
        }
      >
        <EmployeeTargetsTable
          refetchRef={refetchRef}
          month={monthKey}
          onView={setViewing}
          onEdit={openEdit}
          onReopen={reopen}
          onDelete={remove}
        />
      </SectionCard>
      <AssignTargetDialog open={form.open} editing={form.editing} onSubmit={submitForm} onClose={() => setForm(CLOSED)} />
      <TargetDetailDialog
        target={viewing}
        onClose={() => setViewing(null)}
        onEdit={openEdit}
        onReview={review}
        onReopen={reopen}
        onDelete={remove}
      />
    </Stack>
  );
}
