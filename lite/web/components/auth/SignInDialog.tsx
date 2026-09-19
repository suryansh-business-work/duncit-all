import { useId } from 'react';
import { Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useWebT } from '../../../shared/i18n';
import { useSignInPrompt } from '../../app/providers/SignInPromptProvider';
import { SignInPanel } from './SignInPanel';

/** The one sign-in dialog, mounted by the shell and opened through `useSignInPrompt`. */
export function SignInDialog() {
  const { t } = useWebT();
  const { dialogOpen, closeSignIn } = useSignInPrompt();
  const titleId = useId();
  return (
    <Dialog open={dialogOpen} onClose={closeSignIn} aria-labelledby={titleId} fullWidth maxWidth="xs" data-testid="sign-in-dialog">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <DialogTitle id={titleId}>{t('lite.auth.title')}</DialogTitle>
        <DuncitIconButton aria-label={t('lite.auth.close')} onClick={closeSignIn} data-testid="sign-in-dialog-close">
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      <DialogContent>
        <SignInPanel />
      </DialogContent>
    </Dialog>
  );
}
