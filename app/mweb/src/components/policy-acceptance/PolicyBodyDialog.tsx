import { Box, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RICH_TEXT_BODY_SX } from '@duncit/ui';
import { useTranslation } from '../../i18n/useTranslation';
import type { SignupPolicy } from './useSignupPolicies';

/*
  Signup renders the body WITHOUT the editor's stylesheet, so the register route
  does not pull it into its chunk for something it only reads — and so this
  dialog matches the Tamagui sheet the native app shows, which has no Quill.
  The element styling itself is the shared one every reader uses.
*/

interface Props {
  /** The policy being read, or null when nothing is open. */
  policy: SignupPolicy | null;
  onClose: () => void;
}

/**
 * The full text of one policy, read without leaving signup.
 *
 * The HTML comes from the admin-only authoring surface, the same trust boundary
 * PolicyRenderer documents.
 */
export default function PolicyBodyDialog({ policy, onClose }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!policy} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ fontWeight: 700 }}>{policy?.title}</DialogTitle>
      <DialogContent dividers>
        <Box sx={RICH_TEXT_BODY_SX} dangerouslySetInnerHTML={{ __html: policy?.content ?? '' }} />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('policyAcceptance.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
