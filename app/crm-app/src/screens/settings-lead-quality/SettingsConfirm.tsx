import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { QualitySubmission } from '@/features/lead-quality-settings/editor';
import { useTranslation } from '@/hooks/useTranslation';

/** The step waiting for the admin's yes: publishing rescores every lead, discarding and restoring replace the draft. */
export type PendingConfirm =
  | { kind: 'publish'; version: number; submission: QualitySubmission }
  | { kind: 'discard'; version: number }
  | { kind: 'restore'; version: number };

interface Props {
  pending: PendingConfirm | null;
  /** The lead type's name ("Host lead"). */
  typeLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** One confirmation for the three settings steps that cannot be taken back (the portal's dialog). */
export function SettingsConfirm({
  pending,
  typeLabel,
  busy,
  onConfirm,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const vars = { vars: { version: pending?.version ?? '', type: typeLabel } };
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
  const current = copy[pending?.kind ?? 'publish'];
  return (
    <ConfirmDialog
      open={pending !== null}
      title={current.title}
      message={current.message}
      confirmLabel={current.confirm}
      cancelLabel={t('shell.common.cancel')}
      danger={pending?.kind === 'discard'}
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
      testID="lead-quality-confirm"
    />
  );
}
