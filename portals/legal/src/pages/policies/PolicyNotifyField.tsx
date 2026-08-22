import { useQuery } from '@apollo/client';
import { Alert, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { POLICY_NOTIFY_RECIPIENT_COUNT } from '../../graphql/policies';

interface Props {
  /** The policy being edited. Blank for a new one, which has no acceptances. */
  policyId: string;
  checked: boolean;
  summary: string;
  disabled: boolean;
  /** When the last change notice went out, and how far it reached. */
  lastNotifiedAt: string | null;
  lastNotifiedCount: number;
  onCheckedChange: (checked: boolean) => void;
  onSummaryChange: (summary: string) => void;
}

/**
 * The "tell everyone who accepted this" tick, and the note that rides with it.
 *
 * The recipient count is fetched rather than guessed, because a checkbox that
 * says "email 12,480 people" is a very different button from one that says
 * "email nobody" — and Legal is entitled to know which one they are pressing
 * before they press it.
 *
 * The summary box only appears once the box is ticked: an input for an email
 * nobody is sending is an input that gets filled in and then silently dropped.
 */
export default function PolicyNotifyField({
  policyId,
  checked,
  summary,
  disabled,
  lastNotifiedAt,
  lastNotifiedCount,
  onCheckedChange,
  onSummaryChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const { data, loading } = useQuery<{ policyNotifyRecipientCount: number }>(
    POLICY_NOTIFY_RECIPIENT_COUNT,
    { variables: { id: policyId }, skip: !policyId, fetchPolicy: 'cache-and-network' },
  );
  const people = data?.policyNotifyRecipientCount ?? 0;

  const renderReach = () => {
    if (loading && !data) return t('legal.policies.notify.recipientsLoading');
    if (people === 0) return t('legal.policies.notify.recipientsNone');
    return t('legal.policies.notify.recipients', { vars: { people: String(people) } });
  };

  /** What already went out, so a second notice is a decision rather than a slip. */
  const renderLastSent = () => {
    if (!lastNotifiedAt) return t('legal.policies.notify.neverSent');
    return t('legal.policies.notify.lastSent', {
      vars: {
        when: formatDateTime(new Date(lastNotifiedAt)),
        people: String(lastNotifiedCount),
      },
    });
  };

  return (
    <Stack spacing={1}>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            disabled={disabled || people === 0}
            onChange={(e) => onCheckedChange(e.target.checked)}
          />
        }
        label={t('legal.policies.notify.label')}
      />
      <Typography variant="caption" color="text.secondary">
        {renderReach()}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('legal.policies.notify.hint')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {renderLastSent()}
      </Typography>
      {checked && (
        <>
          <Alert severity="info">{t('legal.policies.notify.summaryHint')}</Alert>
          <TextField
            label={t('legal.policies.notify.summaryLabel')}
            value={summary}
            onChange={(e) => onSummaryChange(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            disabled={disabled}
          />
        </>
      )}
    </Stack>
  );
}
