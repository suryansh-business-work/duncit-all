import { useMemo, useState } from 'react';
import { useController, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CircularProgress,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitIconButton } from '@duncit/buttons';
import type { LoginFormValues } from './login.types';
import { loginInitialValues } from './login.types';
import { inkCta } from './glass';
import { sessionT, type SessionTranslate } from '../i18n';

/**
 * Built from the caller's translator, so the messages follow the reader.
 *
 * Not `makeLoginSchema` from `@duncit/forms/schemas`: that is the mWeb/native
 * contract (phone channel, 8-character password floor, `mweb.*` copy), and its
 * output carries phone boxes the console login mutation does not accept.
 */
export const buildLoginSchema = (t: SessionTranslate) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t('session.login.emailRequired'))
      // The HTML5 pattern rather than Zod's stricter default: it is the one this
      // form has always checked against, so no address it accepted is now refused.
      .email({ pattern: z.regexes.html5Email, error: t('session.login.emailInvalid') }),
    password: z.string().min(1, t('session.login.passwordRequired')),
  });

const pillSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper' },
} as const;

// Slot prop types list no `data-*` key, so an inline literal fails the
// excess-property check; a named object carries the id to the helper text.
const EMAIL_ERROR_SLOT = { 'data-testid': 'email-error' };
const PASSWORD_ERROR_SLOT = { 'data-testid': 'password-error' };

interface Props {
  loading?: boolean;
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  onForgotPassword: () => void;
  /** The mounting surface's translator; the shipped English when omitted. */
  t?: SessionTranslate;
}

/** One box's `TextField` wiring: its value, and its error once it has been validated. */
function useLoginField(control: Control<LoginFormValues>, name: keyof LoginFormValues) {
  const {
    field: { ref, ...field },
    fieldState: { error },
  } = useController({ control, name });
  // The ref goes to the <input>, not the root <div>: a failed submit focuses the first invalid box.
  return { ...field, inputRef: ref, error: Boolean(error), helperText: error?.message };
}

export default function LoginForm({
  loading,
  onSubmit,
  onForgotPassword,
  t = sessionT,
}: Readonly<Props>) {
  const [showPwd, setShowPwd] = useState(false);
  // `raw` hands `onSubmit` the values exactly as typed: the schema trims the
  // address to judge it, and the caller still receives what was in the box.
  const resolver = useMemo(() => zodResolver(buildLoginSchema(t), undefined, { raw: true }), [t]);
  const { control, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: loginInitialValues,
    resolver,
    // A box reports its error once it has been left, then on every keystroke.
    mode: 'onTouched',
  });
  const emailField = useLoginField(control, 'email');
  const passwordField = useLoginField(control, 'password');

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
      <Stack spacing={1.5}>
        <TextField
          {...emailField}
          type="email"
          placeholder={t('session.login.email')}
          fullWidth
          required
          sx={pillSx}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <AlternateEmailIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
            // The placeholder is not a label: name the field and state its
            // purpose so assistive tech and autofill both know what it holds.
            htmlInput: { 'data-testid': 'field-email', 'aria-label': t('session.login.email'), autoComplete: 'email' },
            formHelperText: EMAIL_ERROR_SLOT,
          }}
        />
        <TextField
          {...passwordField}
          type={showPwd ? 'text' : 'password'}
          placeholder={t('session.login.password')}
          fullWidth
          required
          sx={pillSx}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <DuncitIconButton
                    onClick={() => setShowPwd((v) => !v)}
                    edge="end"
                    size="small"
                    aria-label={t('session.login.togglePassword')}
                    aria-pressed={showPwd}
                    data-testid="login-toggle-password"
                  >
                    {showPwd ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </DuncitIconButton>
                </InputAdornment>
              ),
            },
            htmlInput: {
              'data-testid': 'field-password',
              'aria-label': t('session.login.password'),
              autoComplete: 'current-password',
            },
            formHelperText: PASSWORD_ERROR_SLOT,
          }}
        />
        <Link
          component="button"
          type="button"
          data-testid="go-forgot-password"
          onClick={onForgotPassword}
          underline="none"
          sx={{
            color: "text.secondary",
            alignSelf: 'flex-start',
            fontSize: 13,
            fontWeight: 600
          }}>
          {t('session.login.forgotPassword')}
        </Link>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            mt: 0.5
          }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              flex: 1
            }}>
            {t('session.login.authorizedOnly')}
          </Typography>
          <DuncitIconButton
            type="submit"
            data-testid="login-submit"
            disabled={loading}
            aria-label={t('session.login.submit')}
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              bgcolor: inkCta.bgcolor,
              color: inkCta.color,
              '&:hover': { bgcolor: inkCta.hoverBgcolor },
              '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
          </DuncitIconButton>
        </Stack>
      </Stack>
    </form>
  );
}
