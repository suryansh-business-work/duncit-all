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

export const loginSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email('Enter a valid e-mail address')
    .required('E-mail address is required'),
  password: yup.string().required('Password is required'),
});

const pillSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper' },
} as const;

interface Props {
  loading?: boolean;
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  onForgotPassword: () => void;
}

export default function LoginForm({ loading, onSubmit, onForgotPassword }: Props) {
  const [showPwd, setShowPwd] = useState(false);
  const formik = useFormik<LoginFormValues>({
    initialValues: loginInitialValues,
    validationSchema: loginSchema,
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
          placeholder="e-mail address"
          fullWidth
          sx={pillSx}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AlternateEmailIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          {...field('password')}
          type={showPwd ? 'text' : 'password'}
          placeholder="password"
          fullWidth
          sx={pillSx}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPwd((v) => !v)} edge="end" size="small" aria-label="toggle password visibility">
                  {showPwd ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Link
          component="button"
          type="button"
          onClick={onForgotPassword}
          underline="none"
          color="text.secondary"
          sx={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 600 }}
        >
          Forgot password?
        </Link>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            Authorized personnel only. Sign in with your Duncit credentials to access the operations portal.
          </Typography>
          <IconButton
            type="submit"
            disabled={loading}
            aria-label="sign in"
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              bgcolor: '#0b0b0f',
              color: '#fff',
              '&:hover': { bgcolor: '#000' },
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
