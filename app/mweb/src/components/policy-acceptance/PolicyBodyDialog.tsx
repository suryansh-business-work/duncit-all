import { Box, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import type { SignupPolicy } from './useSignupPolicies';

/*
  The reader's half of the admin's Quill editor. PolicyRenderer gets these from
  `quill.snow.css`; signup restates them so the register route does not pull the
  editor stylesheet into its chunk for a body it renders read-only — and so this
  dialog matches the Tamagui sheet the native app shows, which has no Quill.
*/
const BODY_SX: SxProps<Theme> = {
  '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
  '& a': { color: 'primary.main' },
  '& h1, & h2, & h3': { mt: 3, mb: 1.5, fontWeight: 700 },
  '& p': { mb: 1.25, lineHeight: 1.7 },
  '& ul, & ol': { pl: 3, mb: 1.5 },
  '& blockquote': {
    borderLeft: 4,
    borderColor: 'divider',
    pl: 2,
    color: 'text.secondary',
    my: 2,
  },
};

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
        <Box sx={BODY_SX} dangerouslySetInnerHTML={{ __html: policy?.content ?? '' }} />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('policyAcceptance.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
