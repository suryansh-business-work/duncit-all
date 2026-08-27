import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { useConfirm, notifyError, notifySuccess } from '@duncit/dialogs';
import PlanFormDialog from './PlanFormDialog';
import PlansTable, { type PlanRow } from './PlansTable';
import { CREATE_PLAN, DELETE_PLAN, PLANS_TABLE, UPDATE_PLAN } from './queries';
import {
  toMembershipPlanInput,
  toMembershipPlanUpdateInput,
  type MembershipPlanFormValues,
} from './membership-plan';
import { useTranslation } from '@duncit/shell';

/** Admin > Membership > Plans — the tier catalogue. */
export default function PlansPanel({ onChanged }: Readonly<{ onChanged: () => void }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [createMut, createState] = useMutation(CREATE_PLAN);
  const [updateMut, updateState] = useMutation(UPDATE_PLAN);
  const [deleteMut] = useMutation(DELETE_PLAN);
  const confirm = useConfirm();
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [open, setOpen] = useState(false);

  const fetchRows = useApolloTableFetch<PlanRow>(client, PLANS_TABLE, 'membershipPlansTable');

  const afterWrite = () => {
    refetchRef.current?.();
    // The Benefits tab builds one input per tier, so it has to hear about this.
    onChanged();
  };

  const onSave = async (values: MembershipPlanFormValues) => {
    try {
      if (editing) {
        await updateMut({
          variables: { plan_id: editing.id, input: toMembershipPlanUpdateInput(values) },
        });
        notifySuccess('Tier updated');
      } else {
        await createMut({ variables: { input: toMembershipPlanInput(values) } });
        notifySuccess('Tier created');
      }
      setOpen(false);
      setEditing(null);
      afterWrite();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not save tier');
    }
  };

  const onDelete = async (row: PlanRow) => {
    const ok = await confirm({
      title: t('admin.membership.deleteTier'),
      message: t('admin.membership.deleteTierBody', { vars: { name: row.name } }),
      destructive: true,
      confirmLabel: t('shell.common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { plan_id: row.id } });
      notifySuccess('Tier deleted');
      afterWrite();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not delete tier');
    }
  };

  return (
    <>
      <PlansTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            New tier
          </DuncitButton>
        }
        onEdit={(row) => {
          setEditing(row);
          setOpen(true);
        }}
        onDelete={onDelete}
      />

      <PlanFormDialog
        open={open}
        editing={editing}
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
