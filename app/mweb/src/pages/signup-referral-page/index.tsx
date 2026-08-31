import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { REFERRAL_CODE } from '@duncit/regex';
import AuthBackground from '../../components/AuthBackground';
import AuthLogo from '../../components/AuthLogo';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import { notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import { parseApiError } from '../../utils/parseApiError';

const APPLY_REFERRAL = gql`
  mutation ApplyReferralOnSignup($code: String!) {
    applyReferralCode(code: $code) {
      code
      coins_per_referral
    }
  }
`;

/**
 * The referral question for accounts Google finished on its own.
 *
 * An email signup asks it on the form, where it can be checked before the
 * account exists. Google hands back a finished account instead, so the question
 * gets its own step — skippable, because a signup must never be held hostage to
 * a code the user does not have.
 */
export default function SignupReferralPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [apply, { loading }] = useMutation<any>(APPLY_REFERRAL);
  const [code, setCode] = useState<string>((location.state as { code?: string })?.code ?? '');
  const [error, setError] = useState<string | null>(null);

  const trimmed = code.trim().toUpperCase();
  const malformed = trimmed !== '' && !REFERRAL_CODE.test(trimmed);

  const submit = async () => {
    setError(null);
    try {
      await apply({ variables: { code: trimmed } });
      notifySuccess(t('mweb.referral.applied'));
      navigate('/signup-survey');
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <AuthBackground>
      <AuthScreenFrame>
        <Stack spacing={2}>
          <Stack
            spacing={1.1}
            sx={{
              alignItems: "center",
              pt: 0.5
            }}>
            <AuthLogo />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                textAlign: "center",
                color: "text.primary"
              }}>
              {t('mweb.referral.promptTitle')}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                textAlign: "center",
                color: "text.secondary"
              }}>
              {t('mweb.referral.promptBodyPlain')}
            </Typography>
          </Stack>

          <TextField
            label={t('mweb.referral.codeLabel')}
            placeholder={t('mweb.referral.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={malformed}
            helperText={malformed ? t('mweb.referral.validation.codePattern') : ' '}
            size="small"
            fullWidth
            slotProps={{
              htmlInput: { 'aria-label': t('mweb.referral.codeLabel') }
            }}
          />

          {error && <Alert severity="error">{error}</Alert>}

          <DuncitButton
            variant="contained"
            fullWidth
            disabled={loading || !trimmed || malformed}
            onClick={() => {
              submit().catch(() => undefined);
            }}
          >
            {loading ? t('mweb.referral.applying') : t('mweb.referral.apply')}
          </DuncitButton>
          <DuncitButton variant="text" fullWidth onClick={() => navigate('/signup-survey')}>
            {t('mweb.referral.skip')}
          </DuncitButton>
        </Stack>
      </AuthScreenFrame>
    </AuthBackground>
  );
}
