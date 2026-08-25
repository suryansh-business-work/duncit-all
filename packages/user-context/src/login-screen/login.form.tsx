import { useState } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  CircularProgress,
  IconButton,
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
import type { LoginFormValues } from './login.types';
import { loginInitialValues } from './login.types';
import { inkCta } from './glass';
import { sessionT, type SessionTranslate } from '../i18n';

/** Built from the caller's translator, so the messages follow the reader. */
export const buildLoginSchema = (t: SessionTranslate) =>
  yup.object({
    email: yup
      .string()
      .trim()
      .email(t('session.login.emailInvalid'))
      .required(t('session.login.emailRequired')),
    password: yup.string().required(t('session.login.passwordRequired')),
  });

const pillSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper' },
} as const;

interface Props {
  loading?: boolean;
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  onForgotPassword: () => void;
  /** The mounting surface's translator; the shipped English when omitted. */
  t?: SessionTranslate;
}

export default function LoginForm({
  loading,
  onSubmit,
  onForgotPassword,
  t = sessionT,
}: Readonly<Props>) {
  const [showPwd, setShowPwd] = useState(false);
  const formik = useFormik<LoginFormValues>({
    initialValues: loginInitialValues,
    validationSchema: buildLoginSchema(t),
    onSubmit: (values) => onSubmit(values),
  });

  const field = (name: keyof LoginFormValues) => ({
    name,
    value: formik.values[name],
    onChange: formik.handleChange,
    onBlur: formik.handleBlur,
    error: Boolean(formik.touched[name] && formik.errors[name]),
    helperText: (formik.touched[name] && formik.errors[name]) as string | undefined,
  });

  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <Stack spacing={1.5}>
        <TextField
          {...field('email')}
          type="email"
          placeholder={t('session.login.email')}
          fullWidth
          sx={pillSx}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <AlternateEmailIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }
          }}
        />
        <TextField
          {...field('password')}
          type={showPwd ? 'text' : 'password'}
          placeholder={t('session.login.password')}
          fullWidth
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
                  <IconButton onClick={() => setShowPwd((v) => !v)} edge="end" size="small" aria-label={t('session.login.togglePassword')}>
                    {showPwd ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }
          }}
        />
        <Link
          component="button"
          type="button"
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
          <IconButton
            type="submit"
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
          </IconButton>
        </Stack>
      </Stack>
    </form>
  );
}
