import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitRichTextInput } from '@duncit/rich-text';
import PolicyTypeSelect from '../../components/PolicyTypeSelect';
import type { Policy } from '../../graphql/policies';
import PolicyNotifyField from './PolicyNotifyField';
import { useTranslation } from '@duncit/shell';

export interface PolicyFormState {
  slug: string;
  title: string;
  /** Groups this policy on the dashboard. Blank counts as "Other". */
  policy_type: string;
  content: string;
  is_active: boolean;
  sort_order: number;
  /**
   * Email everyone who has already accepted this policy that it changed.
   *
   * Off on every open, deliberately: a mail to everyone who ever signed up is
   * not something anyone should send by leaving a box as they found it.
   */
  notify_accepted_users: boolean;
  /** Legal's own note on what changed, shown in that email. */
  notify_summary: string;
}

export const EMPTY_POLICY_FORM: PolicyFormState = {
  slug: '',
  title: '',
  policy_type: '',
  content: '',
  is_active: true,
  sort_order: 0,
  notify_accepted_users: false,
  notify_summary: '',
};

/**
 * The row shape a brand-new policy stands in as until the server writes it.
 *
 * `policy_no` and `content_hash` are blank on purpose: both are minted on
 * insert, and a placeholder for either would be a value somebody could quote
 * that never existed.
 */
export const EMPTY_POLICY_ROW: Policy = {
  id: '',
  policy_no: '',
  slug: '',
  title: '',
  policy_type: '',
  content: '',
  is_active: true,
  sort_order: 0,
  version_count: 1,
  content_hash: '',
  last_notified_at: null,
  last_notified_count: 0,
  updated_at: '',
};

interface Props {
  open: boolean;
  isNew: boolean;
  /**
   * The row being edited — its id, its title and what it has already been
   * notified about. `EMPTY_POLICY_ROW` stands in while creating, which is why
   * the notify field is hidden then: nobody can have accepted a policy that
   * does not exist yet.
   */
  editing: Policy | null;
  form: PolicyFormState;
  error: string | null;
  saving: boolean;
  onTitle: (title: string) => void;
  onChange: (patch: Partial<PolicyFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function PolicyFormDialog({
  open,
  isNew,
  editing,
  form,
  error,
  saving,
  onTitle,
  onChange,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const heading = isNew
    ? t('legal.policies.createTitle')
    : t('legal.policies.editTitle', { vars: { title: editing?.title ?? '' } });
  const activeLabel = form.is_active ? t('legal.policies.active') : t('legal.policies.hidden');
  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="md">
      <DialogTitle>{heading}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label={t('shell.common.title')} value={form.title} onChange={(e) => onTitle(e.target.value)} required fullWidth autoFocus />
            <TextField
              label={t('legal.policies.slug')}
              value={form.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              required
              fullWidth
              helperText={t('legal.policies.slugHint')}
            />
          </Stack>
          <PolicyTypeSelect
            value={form.policy_type}
            onChange={(policy_type) => onChange({ policy_type })}
          />
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label={t('legal.policies.sortOrder')}
              type="number"
              value={form.sort_order}
              onChange={(e) => onChange({ sort_order: Number(e.target.value) })}
              size="small"
              sx={{ width: 150 }}
            />
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />}
              label={activeLabel}
            />
          </Stack>
          <Box>
            <Typography variant="caption" color="text.secondary">{t('legal.policies.content')}</Typography>
            <DuncitRichTextInput
              value={form.content}
              onChange={(value) => onChange({ content: value })}
              minHeight={260}
              aiContext="legal policy"
            />
          </Box>
          {/* Only when editing: a policy that does not exist yet cannot have
              been accepted, so there is nobody the tick could write to. */}
          {!isNew && (
            <PolicyNotifyField
              policyId={editing?.id ?? ''}
              checked={form.notify_accepted_users}
              summary={form.notify_summary}
              disabled={saving}
              lastNotifiedAt={editing?.last_notified_at ?? null}
              lastNotifiedCount={editing?.last_notified_count ?? 0}
              onCheckedChange={(notify_accepted_users) => onChange({ notify_accepted_users })}
              onSummaryChange={(notify_summary) => onChange({ notify_summary })}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{t('shell.common.cancel')}</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {t('shell.common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
