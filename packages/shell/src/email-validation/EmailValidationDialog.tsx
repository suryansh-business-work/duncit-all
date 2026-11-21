import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { createLogger, fireAndForget } from '@duncit/logs';
import { useTranslation } from '../i18n/useTranslation';
import { EmailCheckList } from './EmailCheckList';
import { EmailValidationResult } from './EmailValidationResult';
import { VALIDATE_EMAIL, type EmailValidationResultData } from './queries';

const logger = createLogger('portal');
const TITLE_ID = 'email-validation-title';
/** A response with no result — logged, and shown as the plain "could not validate" sentence. */
const NO_RESULT = new Error('Email validation returned no result');

type RunState =
  | { status: 'running' }
  | { status: 'done'; result: EmailValidationResultData }
  | { status: 'failed'; message: string };

export interface EmailValidationDialogProps {
  /** The address to validate; null keeps the dialog closed. */
  email: string | null;
  /** This console's portal key — the log records where each check ran. */
  portal: string;
  onClose: () => void;
}

interface BodyProps {
  email: string;
  portal: string;
  onClose: () => void;
}

/** The open dialog's content: it runs the check for `email` and owns its state. */
function ValidationBody({ email, portal, onClose }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  const [validate] = useMutation(VALIDATE_EMAIL);
  const [state, setState] = useState<RunState>({ status: 'running' });
  const runId = useRef(0);

  const run = useCallback(
    async (address: string) => {
      const id = ++runId.current;
      setState({ status: 'running' });
      try {
        const { data } = await validate({ variables: { email: address, portal } });
        if (id !== runId.current) return;
        if (!data) throw NO_RESULT;
        setState({ status: 'done', result: data.validateEmail });
      } catch (error) {
        if (id !== runId.current) return;
        // The address itself stays out of the log line.
        logger.warn('emailValidation', 'validate', { error, portal, msg: 'Email validation failed' });
        // The server's reason follows the translated sentence; an empty answer has none to add.
        const reason = error instanceof Error && error !== NO_RESULT ? error.message : '';
        setState({ status: 'failed', message: reason });
      }
    },
    [validate, portal]
  );

  useEffect(() => {
    fireAndForget(run(email), logger, 'emailValidation', 'validate');
    // Closing, or moving to another address, invalidates whatever is still in flight.
    return () => {
      runId.current += 1;
    };
  }, [email, run]);

  const running = state.status === 'running';
  return (
    <>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ wordBreak: 'break-all' }} data-testid="email-validation-address">
            {email}
          </Typography>
          {running ? (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('shell.emailValidation.checkingHint')}
              </Typography>
              <EmailCheckList />
            </>
          ) : null}
          {state.status === 'done' ? <EmailValidationResult result={state.result} /> : null}
          {state.status === 'failed' ? (
            <Alert severity="error" data-testid="email-validation-error">
              {t('shell.emailValidation.failed')} {state.message}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={() => fireAndForget(run(email), logger, 'emailValidation', 'again')} disabled={running} data-testid="email-validation-again">
          {t(state.status === 'failed' ? 'shell.emailValidation.retry' : 'shell.emailValidation.again')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={onClose} data-testid="email-validation-close">
          {t('shell.common.close')}
        </DuncitButton>
      </DialogActions>
    </>
  );
}

/**
 * Validates an address the moment it opens and shows every test as it lands.
 * A check can take up to a minute (the mail server is asked directly), so the
 * tests are listed with spinners first. An answer that arrives after the
 * dialog moved on — closed, reopened for another address, run again — is
 * dropped, so the screen never shows one address's result under another.
 */
export function EmailValidationDialog({ email, portal, onClose }: Readonly<EmailValidationDialogProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog
      open={Boolean(email)}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      fullScreen={fullScreen}
      aria-labelledby={TITLE_ID}
      data-testid="email-validation-dialog"
    >
      <DialogTitle id={TITLE_ID}>{t('shell.emailValidation.title')}</DialogTitle>
      {email ? <ValidationBody email={email} portal={portal} onClose={onClose} /> : null}
    </Dialog>
  );
}
