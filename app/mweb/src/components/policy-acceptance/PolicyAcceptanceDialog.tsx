import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import PolicyAcceptanceList from './PolicyAcceptanceList';
import { toggleAccepted } from './acceptance';
import type { SignupPolicy } from './useSignupPolicies';

interface Props {
  open: boolean;
  /**
   * Swaps the intro for the post-Google wording. Google has proved who they
   * are, but the account genuinely does not exist yet — saying so is the point.
   */
  afterGoogle?: boolean;
  policies: readonly SignupPolicy[];
  loading: boolean;
  failed: boolean;
  accepted: readonly string[];
  /** A single row changed. */
  onChange: (ids: string[]) => void;
  /**
   * The dialog is finished, carrying the final set.
   *
   * The ids travel with the call rather than being read from `accepted` by the
   * parent: "Accept all" ticks and closes in one press, and a parent reading its
   * own state in that handler would still be holding the pre-click value.
   */
  onClose: (ids: string[]) => void;
}

/**
 * Every policy that gates signup, each with its own tick box.
 *
 * Row ticks write straight through, so partial progress survives a close and
 * re-open. Nothing here knows about signup: the parent decides what a complete
 * set means, which is why the same dialog serves the form and the Google pass.
 */
export default function PolicyAcceptanceDialog({
  open,
  afterGoogle,
  policies,
  loading,
  failed,
  accepted,
  onChange,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const intro = afterGoogle ? t('policyAcceptance.googleIntro') : t('policyAcceptance.dialogIntro');
  const ticked = new Set(accepted);
  const done = policies.filter((policy) => ticked.has(policy.id)).length;
  const complete = done === policies.length;
  // An unresolved list is an empty list, and "0 of 0 accepted" beside a spinner
  // reads as a finished job. The summary waits until there is something to sum.
  const ready = !loading && !failed;

  const finish = () => onClose([...accepted]);
  const acceptAll = () => onClose(policies.map((policy) => policy.id));

  return (
    <Dialog open={open} onClose={finish} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('policyAcceptance.dialogTitle')}</DialogTitle>
      <DialogContent dividers>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1.5
          }}>
          {intro}
        </Typography>
        <PolicyAcceptanceList
          policies={policies}
          loading={loading}
          failed={failed}
          accepted={accepted}
          onToggle={(id, next) => onChange(toggleAccepted(accepted, id, next))}
        />
        {ready && (
          <Stack spacing={0.5} sx={{ mt: 1.5 }}>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('policyAcceptance.acceptedCount', {
                vars: { done, total: policies.length },
              })}
            </Typography>
            {!complete && (
              <Typography variant="caption" sx={{
                color: "error.main"
              }}>
                {t('policyAcceptance.mustAcceptHint')}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={finish}>{t('policyAcceptance.close')}</DuncitButton>
        <DuncitButton variant="contained" onClick={acceptAll} disabled={!ready}>
          {t('policyAcceptance.acceptAll')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
