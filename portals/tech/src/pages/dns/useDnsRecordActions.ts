import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import type { DnsRecord, DnsRecordInput, DnsRecordRef } from '@duncit/gql-types';
import { ADD_DNS_RECORD, DELETE_DNS_RECORD, DNS_ZONE, UPDATE_DNS_RECORD, recordHost } from './queries';

/** GoDaddy has no record id: a record is addressed by the values the listing showed. */
const refOf = (row: Readonly<DnsRecord>): DnsRecordRef => ({ type: row.type, name: row.name, data: row.data });

/** Every write re-reads the zone, so the table shows what GoDaddy now holds rather than what was sent. */
const REFETCH = { refetchQueries: [DNS_ZONE], awaitRefetchQueries: true };

/** Add, edit and delete for one zone, and the dialog state around them. */
export function useDnsRecordActions(domain: string) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [addRecord] = useMutation(ADD_DNS_RECORD, REFETCH);
  const [updateRecord] = useMutation(UPDATE_DNS_RECORD, REFETCH);
  const [deleteRecord] = useMutation(DELETE_DNS_RECORD, REFETCH);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DnsRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setOpError(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((row: DnsRecord) => {
    setEditing(row);
    setOpError(null);
    setDialogOpen(true);
  }, []);

  const close = useCallback(() => setDialogOpen(false), []);

  const submit = async (input: DnsRecordInput) => {
    setSaving(true);
    setOpError(null);
    try {
      if (editing) await updateRecord({ variables: { ref: refOf(editing), input } });
      else await addRecord({ variables: { input } });
      setDialogOpen(false);
      notifySuccess(t('shell.common.saved'));
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('tech.dns.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = useCallback(
    async (row: DnsRecord) => {
      const ok = await confirm({
        title: t('tech.dns.deleteRecord'),
        message: t('tech.dns.deleteConfirm', {
          vars: { type: row.type, host: recordHost(row.name, domain), data: row.data },
        }),
        destructive: true,
        confirmLabel: t('shell.common.delete'),
      });
      if (!ok) return;
      try {
        await deleteRecord({ variables: { ref: refOf(row) } });
        notifySuccess(t('shell.common.deleted'));
      } catch (e) {
        notifyError(e instanceof Error ? e.message : t('tech.dns.deleteFailed'));
      }
    },
    [confirm, deleteRecord, domain, t],
  );

  return { dialogOpen, editing, saving, opError, openCreate, openEdit, close, submit, remove };
}
