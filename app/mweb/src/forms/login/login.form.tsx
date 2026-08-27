import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, InputAdornment, Stack, keyframes } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import RhfTextField from '../components/RhfTextField';
import { useTranslation } from '../../i18n/useTranslation';
import { loginDefaults, makeLoginSchema, type LoginFormValues } from './login.types';

const fadeUp = keyframes`
  0%   { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
`;

interface Props {
  loading?: boolean;
  initialValues?: LoginFormValues;
  errorMessage?: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  submitLabel?: string;
}

export default function LoginForm({
  loading,
  initialValues,
  errorMessage,
  onSubmit,
  submitLabel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [showPwd, setShowPwd] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const schema = useMemo(() => makeLoginSchema(t), [t]);
  const { control, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: initialValues ?? loginDefaults,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('mweb.auth.somethingWentWrong'));
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack
        spacing={1.5}
        sx={{
          '& > *': { animation: `${fadeUp} 0.5s ease-out both` },
          '& > *:nth-of-type(1)': { animationDelay: '0.05s' },
          '& > *:nth-of-type(2)': { animationDelay: '0.12s' },
          '& > *:nth-of-type(3)': { animationDelay: '0.18s' },
        }}
      >
        <RhfTextField
          control={control}
          name="email"
          type="email"
          label={t('mweb.auth.emailLabel')}
          required
          placeholder={t('mweb.auth.emailPlaceholder')}
          autoComplete="email"
          size="small"
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          } }}
        />
        <RhfTextField
          control={control}
          name="password"
          type={showPwd ? 'text' : 'password'}
          label={t('mweb.auth.passwordLabel')}
          required
          hint={t('mweb.auth.passwordHint')}
          placeholder={t('mweb.login.passwordPlaceholder')}
          autoComplete="current-password"
          size="small"
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <DuncitIconButton
                  size="small"
                  onClick={() => setShowPwd((v) => !v)}
                  edge="end"
                  aria-label={showPwd ? t('mweb.auth.hidePassword') : t('mweb.auth.showPassword')}
                >
                  {showPwd ? (
                    <VisibilityOffOutlinedIcon fontSize="small" />
                  ) : (
                    <VisibilityOutlinedIcon fontSize="small" />
                  )}
                </DuncitIconButton>
              </InputAdornment>
            ),
          } }}
        />
        <DuncitButton
          type="submit"
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          disabled={loading}
          sx={{
            borderRadius: '16px',
            py: 1.25,
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: '0 8px 20px rgba(255,77,79,0.3)',
            transition: 'transform 0.18s ease',
            '&:hover': { transform: 'translateY(-1px)' },
          }}
        >
          {loading ? t('mweb.login.submitting') : (submitLabel ?? t('mweb.login.submit'))}
        </DuncitButton>
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
      </Stack>
    </form>
  );
}

export type { LoginFormValues } from './login.types';
