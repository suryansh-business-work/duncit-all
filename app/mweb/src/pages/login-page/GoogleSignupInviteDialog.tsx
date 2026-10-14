import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  SOCIAL_AUTH_COPY,
  SOCIAL_PROMPT_COPY,
  SOCIAL_PROMPT_TEST_IDS,
  type SocialAccountPrompt,
  type SocialProvider,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  /** Which question: the login door's INVITE (default) or the signup door's EXISTS. */
  prompt?: SocialAccountPrompt;
  /** Which door refused — the detail line names it. */
  provider: SocialProvider;
  /** The address Google verified — named so the invite is about THEIR account
   * rather than about accounts in general. */
  email: string;
  onAccept: () => void;
  onDismiss: () => void;
}

/**
 * "Google knows you, Duncit does not — shall we make you an account?"
 *
 * Shown when `loginWithGoogle` answers GOOGLE_ACCOUNT_NOT_FOUND. It replaced a
 * notice that said the same thing as a refusal and then dropped the person on
 * the signup screen with nothing carried over, so the only way forward was to
 * press the same Google button a second time. Accepting here carries the
 * credential Google already returned straight into signup.
 *
 * The detail line is the promise the copy has to keep: a Google credential
 * carries no number and no birthday, so signup still has two questions and a
 * code to ask — and nothing exists until they are answered. Saying that here is
 * what stops "we will make your account" reading as though it already happened.
 *
 * The mirror question (EXISTS) is the signup door's: "you're already on Duncit
 * — log in instead?", asked before any number or code. It has no detail line —
 * logging in asks nothing more.
 *
 * Dismissable, unlike the link-consent dialog beside it: nothing is pending on
 * this answer, so backdrop and Escape are just "not now". Native twin:
 * app/mobile-app/src/components/GoogleSignupInviteModal.tsx.
 */
export default function GoogleSignupInviteDialog({
  open,
  prompt = 'INVITE',
  provider,
  email,
  onAccept,
  onDismiss,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = SOCIAL_PROMPT_COPY[prompt];
  const ids = SOCIAL_PROMPT_TEST_IDS[prompt];
  const Icon = prompt === 'EXISTS' ? LoginRoundedIcon : PersonAddRoundedIcon;

  return (
    <Dialog data-testid={ids.root} open={open} onClose={onDismiss} fullWidth maxWidth="xs">
      <DialogTitle data-testid={ids.title} sx={{ fontSize: 17, fontWeight: 600 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Icon fontSize="small" sx={{ color: 'secondary.main' }} />
          <span>{t(copy.title)}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2">{t(copy.body, { vars: { email } })}</Typography>
          {prompt === 'INVITE' && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t(SOCIAL_AUTH_COPY[provider].notFoundDetail)}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <DuncitButton
          data-testid={ids.dismiss}
          variant="outlined"
          color="inherit"
          onClick={onDismiss}
          sx={{ flex: 1 }}
        >
          {t(copy.dismiss)}
        </DuncitButton>
        <DuncitButton data-testid={ids.accept} variant="contained" onClick={onAccept} sx={{ flex: 1.4 }}>
          {t(copy.accept)}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
