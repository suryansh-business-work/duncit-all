import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RateLimitRuleFormBody, type RateLimitRuleForm } from './rate-limit-rule';
import type { RateLimitOptionsData } from '../queries';

interface Props {
  open: boolean;
  editing: RateLimitRuleForm | null;
  options: RateLimitOptionsData;
  saving: boolean;
  opError: string | null;
  onClose: () => void;
  onSubmit: (input: Record<string, unknown>) => void;
}

/**
 * The editor in a dialog.
 *
 * Mounted only while open (`keepMounted` is deliberately absent) so the form
 * reads its defaults from the row that was just clicked — an always-mounted
 * dialog captures the first seed it ever saw and shows stale values for every
 * row after it.
 */
export default function RuleDialog({
  open,
  editing,
  options,
  saving,
  opError,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {editing ? t('tech.rateLimit.rules.editRule') : t('tech.rateLimit.rules.newRule')}
      </DialogTitle>
      <DialogContent dividers>
        <RateLimitRuleFormBody
          options={options}
          initial={editing ?? undefined}
          saving={saving}
          opError={opError}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
