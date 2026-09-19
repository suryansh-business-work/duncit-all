import { useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { DnsRecord, DnsRecordInput, DnsZone } from '@duncit/gql-types';
import { DnsRecordFormBody, blankRecord, toForm } from './dns-record';

interface Props {
  open: boolean;
  zone: DnsZone;
  /** The record being edited, or null to add one. */
  editing: DnsRecord | null;
  saving: boolean;
  opError: string | null;
  onClose: () => void;
  onSubmit: (input: DnsRecordInput) => void;
}

/**
 * The editor in a dialog.
 *
 * Mounted only while open so the form reads its defaults from the row that was
 * just clicked — an always-mounted dialog keeps the first seed it ever saw.
 */
export default function DnsRecordDialog({ open, zone, editing, saving, opError, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const initial = useMemo(() => (editing ? toForm(editing) : blankRecord(zone)), [editing, zone]);
  if (!open) return null;
  const title = editing ? t('tech.dns.editRecord') : t('tech.dns.addRecord');
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="dns-record-dialog-title" data-testid="dns-record-dialog">
      <DialogTitle id="dns-record-dialog-title">{title}</DialogTitle>
      <DialogContent dividers>
        <DnsRecordFormBody
          zone={zone}
          initial={initial}
          editing={editing !== null}
          saving={saving}
          opError={opError}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
