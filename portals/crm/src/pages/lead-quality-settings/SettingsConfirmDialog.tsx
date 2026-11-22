import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import type { CrmLeadEntityType } from '../../api/crm.types';
import type { LeadQualitySubmission } from '../../forms/lead-quality-config';
import { LEAD_KIND_LABEL_KEY } from '../../lib/leadKinds';

/** The step waiting for the admin's yes: publishing rescores every lead, discarding and restoring replace the draft. */
export type PendingConfirm =
  | { kind: 'publish'; version: number; submission: LeadQualitySubmission }
  | { kind: 'discard'; version: number }
  | { kind: 'restore'; version: number };

interface Props {
  pending: PendingConfirm | null;
  leadType: CrmLeadEntityType;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** One MUI confirmation for the three settings steps that cannot be taken back. */
export default function SettingsConfirmDialog({ pending, leadType, busy, onConfirm, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const vars = { vars: { version: pending?.version ?? '', type: t(LEAD_KIND_LABEL_KEY[leadType]) } };
  const copy = {
    publish: {
      title: t('crm.leadQualitySettings.publishTitle', vars),
      message: t('crm.leadQualitySettings.publishMessage', vars),
      confirm: t('crm.leadQualitySettings.publish'),
    },
    discard: {
      title: t('crm.leadQualitySettings.discardTitle', vars),
      message: t('crm.leadQualitySettings.discardMessage', vars),
      confirm: t('crm.leadQualitySettings.discardDraft'),
    },
    restore: {
      title: t('crm.leadQualitySettings.restoreTitle', vars),
      message: t('crm.leadQualitySettings.restoreMessage', vars),
      confirm: t('crm.leadQualitySettings.restore'),
    },
  };
  const current = pending ? copy[pending.kind] : null;

  return (
    <ConfirmDialog
      open={pending !== null}
      title={current?.title ?? ''}
      message={current?.message}
      confirmLabel={current?.confirm}
      destructive={pending?.kind === 'discard'}
      loading={busy}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
