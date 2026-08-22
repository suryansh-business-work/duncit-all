import { useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import { useConfirm, notifyError, notifySuccess } from '@duncit/dialogs';
import BenefitFormDialog, { type BenefitDialogPlan } from './BenefitFormDialog';
import BenefitsTable, { type BenefitRow } from './BenefitsTable';
import { BENEFITS_TABLE, CREATE_BENEFIT, DELETE_BENEFIT, PLANS, UPDATE_BENEFIT } from './queries';
import { toMembershipBenefitInput, type MembershipBenefitFormValues } from './membership-benefit';
import { useTranslation } from '@duncit/shell';

interface PlanOption {
  id: string;
  key: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

/** Admin > Membership > Plans > Benefits — the comparison rows. */
export default function BenefitsPanel({ plansVersion }: Readonly<{ plansVersion: number }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [createMut, createState] = useMutation(CREATE_BENEFIT);
  const [updateMut, updateState] = useMutation(UPDATE_BENEFIT);
  const [deleteMut] = useMutation(DELETE_BENEFIT);
  const confirm = useConfirm();
  const [editing, setEditing] = useState<BenefitRow | null>(null);
  const [open, setOpen] = useState(false);

  const { data, refetch } = useQuery<{ membershipPlans: PlanOption[] }>(PLANS, {
    fetchPolicy: 'cache-and-network',
  });

  // `plansVersion` bumps whenever the Plans tab writes. Refetching on it is what
  // puts a just-created tier's input in the row dialog; the query itself takes
  // no variables, so the version cannot ride along as one.
  useEffect(() => {
    if (plansVersion > 0) refetch().catch(() => undefined);
  }, [plansVersion, refetch]);

  const plans = useMemo<BenefitDialogPlan[]>(
    () =>
      (data?.membershipPlans ?? [])
        .filter((p) => p.is_active)
        .map((p) => ({ key: p.key, name: p.name })),
    [data]
  );

  const fetchRows = useApolloTableFetch<BenefitRow>(
    client,
    BENEFITS_TABLE,
    'membershipBenefitsTable'
  );

  const onSave = async (values: MembershipBenefitFormValues) => {
    try {
      const input = toMembershipBenefitInput(values);
      if (editing) {
        await updateMut({ variables: { benefit_id: editing.id, input } });
        notifySuccess('Row updated');
      } else {
        await createMut({ variables: { input } });
        notifySuccess('Row created');
      }
      setOpen(false);
      setEditing(null);
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not save row');
    }
  };

  const onDelete = async (row: BenefitRow) => {
    const ok = await confirm({
      title: t('admin.membership.deleteRow'),
      message: `Delete "${row.label}" from the comparison table?`,
      destructive: true,
      confirmLabel: t('shell.common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { benefit_id: row.id } });
      notifySuccess('Row deleted');
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not delete row');
    }
  };

  return (
    <>
      <BenefitsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            New row
          </Button>
        }
        onEdit={(row) => {
          setEditing(row);
          setOpen(true);
        }}
        onDelete={onDelete}
      />

      <BenefitFormDialog
        open={open}
        editing={editing}
        plans={plans}
        loading={createState.loading || updateState.loading}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={onSave}
      />
    </>
  );
}
