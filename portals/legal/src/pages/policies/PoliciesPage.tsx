import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import {
  CREATE_POLICY,
  DELETE_POLICY,
  NOTIFY_POLICY_ACCEPTED_USERS,
  POLICIES_TABLE,
  UPDATE_POLICY,
  type Policy,
} from '../../graphql/policies';
import { slugify } from '../../lib/slug';
import PoliciesTable from './PoliciesTable';
import PolicyFormDialog, {
  EMPTY_POLICY_FORM,
  EMPTY_POLICY_ROW,
  type PolicyFormState,
} from './PolicyFormDialog';
import PolicyVersionsDialog from './PolicyVersionsDialog';
import PolicyConfirmDialogs from './PolicyConfirmDialogs';
import { useTranslation } from '@duncit/shell';

export default function PoliciesPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useApolloTableFetch<Policy>(client, POLICIES_TABLE, 'policiesTable');

  const [editing, setEditing] = useState<Policy | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<PolicyFormState>(EMPTY_POLICY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [delTarget, setDelTarget] = useState<Policy | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Policy | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<Policy | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createMut, { loading: creating }] = useMutation(CREATE_POLICY);
  const [updateMut, { loading: updating }] = useMutation(UPDATE_POLICY);
  const [deleteMut] = useMutation(DELETE_POLICY);
  const [notifyMut, { loading: notifying }] = useMutation(NOTIFY_POLICY_ACCEPTED_USERS);
  const saving = creating || updating;

  const openNew = () => {
    setIsNew(true);
    setEditing({ ...EMPTY_POLICY_ROW });
    setForm({ ...EMPTY_POLICY_FORM });
    setSlugTouched(false);
    setError(null);
  };

  const openEdit = (p: Policy) => {
    setIsNew(false);
    setEditing(p);
    // The notify tick resets on every open. A mail to everyone who ever signed
    // up must not go out because somebody left a box as they found it.
    setForm({
      slug: p.slug,
      title: p.title,
      policy_type: p.policy_type || '',
      content: p.content || '',
      is_active: p.is_active,
      sort_order: p.sort_order,
      notify_accepted_users: false,
      notify_summary: '',
    });
    setSlugTouched(true);
    setError(null);
  };

  const onTitle = (title: string) => {
    setForm((f) => ({ ...f, title, slug: isNew && !slugTouched ? slugify(title) : f.slug }));
  };

  const onFormChange = (patch: Partial<PolicyFormState>) => {
    if (patch.slug !== undefined) setSlugTouched(true);
    setForm((f) => ({ ...f, ...patch }));
  };

  /** Say how many people were written to, so a send is never silent. */
  const reportNotified = (people: number) => {
    if (people > 0) {
      notifySuccess(t('legal.policies.notify.sent', { vars: { people: String(people) } }));
      return;
    }
    notifySuccess(t('legal.policies.notify.sentNone'));
  };

  const submit = async () => {
    setError(null);
    if (!form.title.trim()) return setError(t('legal.policies.titleRequired'));
    const slug = slugify(form.slug || form.title);
    if (!slug) return setError(t('legal.policies.slugRequired'));
    const input = {
      slug,
      title: form.title.trim(),
      policy_type: form.policy_type.trim(),
      content: form.content,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      notify_accepted_users: form.notify_accepted_users,
      notify_summary: form.notify_summary.trim(),
    };
    try {
      if (isNew) {
        await createMut({ variables: { input } });
        notifySuccess(t('legal.policies.created'));
      } else {
        await updateMut({ variables: { id: editing!.id, input } });
        notifySuccess(t('legal.policies.updated'));
      }
      setEditing(null);
      refetchRef.current?.();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const doDelete = async () => {
    /* v8 ignore next -- the confirm dialog only opens once a target is set */
    if (!delTarget) return;
    await deleteMut({ variables: { id: delTarget.id } });
    notifySuccess(t('legal.policies.deleted'));
    setDelTarget(null);
    refetchRef.current?.();
  };

  const doNotify = async () => {
    /* v8 ignore next -- the confirm dialog only opens once a target is set */
    if (!notifyTarget) return;
    const res = await notifyMut({ variables: { id: notifyTarget.id, summary: '' } });
    reportNotified(res.data?.notifyPolicyAcceptedUsers ?? 0);
    setNotifyTarget(null);
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2}>
      <PageHeader title={t('legal.policies.title')} subtitle={t('legal.policies.subtitle')} />

      <PoliciesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onEdit={openEdit}
        onRemove={setDelTarget}
        onHistory={setHistoryTarget}
        onNotify={setNotifyTarget}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            {t('legal.policies.create')}
          </DuncitButton>
        }
      />

      <PolicyFormDialog
        open={!!editing}
        isNew={isNew}
        editing={editing}
        form={form}
        error={error}
        saving={saving}
        onTitle={onTitle}
        onChange={onFormChange}
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />

      <PolicyVersionsDialog policy={historyTarget} onClose={() => setHistoryTarget(null)} />

      <PolicyConfirmDialogs
        deleteTarget={delTarget}
        notifyTarget={notifyTarget}
        notifying={notifying}
        onDeleteConfirm={doDelete}
        onDeleteClose={() => setDelTarget(null)}
        onNotifyConfirm={doNotify}
        onNotifyClose={() => setNotifyTarget(null)}
      />
    </Stack>
  );
}
