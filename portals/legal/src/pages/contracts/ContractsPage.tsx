import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import {
  ARCHIVE_CONTRACT,
  CONTRACTS_TABLE,
  CREATE_CONTRACT,
  UPDATE_CONTRACT,
  type Contract,
} from '../../graphql/contracts';
import ContractsTable from './ContractsTable';
import ContractFormDialog, { EMPTY_CONTRACT_FORM, type ContractFormState } from './ContractFormDialog';
import { SignWorkflowDialog } from '../../components/signing';
import { CONTRACT_SIGNING_OPS } from '../../graphql/signing';
import { useTranslation } from '@duncit/shell';

/** `<input type="date">` wants YYYY-MM-DD; the API speaks ISO. */
const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

export default function ContractsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  // Admin-configured format and time zone, so a contract's "last updated" reads
  // the same here as everywhere else in the platform.
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });

  const fetchRows = useApolloTableFetch<Contract>(client, CONTRACTS_TABLE, 'contractsTable');

  const [open, setOpen] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState<ContractFormState>(EMPTY_CONTRACT_FORM);
  const [error, setError] = useState<string | null>(null);
  /** View opens the same dialog with everything locked — one screen, two doors. */
  const [readOnly, setReadOnly] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Contract | null>(null);
  const [signTarget, setSignTarget] = useState<Contract | null>(null);

  const [createMut, { loading: creating }] = useMutation(CREATE_CONTRACT);
  const [updateMut, { loading: updating }] = useMutation(UPDATE_CONTRACT);
  const [archiveMut, { loading: archiving }] = useMutation(ARCHIVE_CONTRACT);
  const saving = creating || updating;

  /** Every write ends here, so the table is never stale after one. */
  const refresh = () => refetchRef.current?.();

  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setReadOnly(false);
    setForm({ ...EMPTY_CONTRACT_FORM });
    setError(null);
    setOpen(true);
  };

  const openContract = (contract: Contract, mode: 'view' | 'edit') => {
    setIsNew(false);
    setEditing(contract);
    setReadOnly(mode === 'view');
    setForm({
      title: contract.title,
      counterparty: contract.counterparty ?? '',
      description: contract.description ?? '',
      status: contract.status,
      effective_from: toDateInput(contract.effective_from),
      effective_to: toDateInput(contract.effective_to),
      content: contract.content ?? '',
    });
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError(t('legal.contracts.titleRequired'));
      return;
    }
    const input = {
      title: form.title.trim(),
      counterparty: form.counterparty.trim(),
      description: form.description.trim(),
      status: form.status,
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
      content: form.content,
    };
    try {
      if (isNew) {
        await createMut({ variables: { input } });
        notifySuccess(t('legal.contracts.created'));
      } else if (editing) {
        await updateMut({ variables: { id: editing.id, input } });
        notifySuccess(t('legal.contracts.updated'));
      }
      setOpen(false);
      refresh();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveMut({ variables: { id: archiveTarget.id } });
      notifySuccess(t('legal.contracts.archived'));
    } finally {
      setArchiveTarget(null);
      refresh();
    }
  };

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('legal.contracts.title')}
        subtitle={t('legal.contracts.subtitle')}
      />

      <ContractsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        onView={(c) => openContract(c, 'view')}
        onEdit={(c) => openContract(c, 'edit')}
        onArchive={setArchiveTarget}
        onSign={setSignTarget}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            {t('legal.contracts.add')}
          </Button>
        }
      />

      <ContractFormDialog
        open={open}
        isNew={isNew}
        editingTitle={editing?.title ?? ''}
        contractNo={editing?.contract_no}
        readOnly={readOnly}
        form={form}
        error={error}
        saving={saving}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      />

      <SignWorkflowDialog
        record={
          signTarget
            ? {
                id: signTarget.id,
                title: signTarget.title,
                signing_status: signTarget.signing_status,
              }
            : null
        }
        ops={CONTRACT_SIGNING_OPS}
        onClose={() => setSignTarget(null)}
        onSigned={refresh}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        title={t('legal.contracts.archiveTitle')}
        message={t('legal.contracts.archiveMessage', { vars: { title: archiveTarget?.title ?? '' } })}
        confirmLabel={t('legal.contracts.archive')}
        confirmColor="warning"
        loading={archiving}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
      />
    </Stack>
  );
}
