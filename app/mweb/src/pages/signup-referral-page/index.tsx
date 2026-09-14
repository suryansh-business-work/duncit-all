import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router';
import { Alert, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { REFERRAL_CODE } from '@duncit/regex';
import AuthBackground from '../../components/AuthBackground';
import AuthHeading from '../../components/AuthHeading';
import AuthScreenFrame from '../../components/AuthScreenFrame';
import { notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import { parseApiError } from '../../utils/parseApiError';
import { MY_COIN_BALANCE } from '../duncit-coin-page/queries';

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
  // A referral pays the new account coins, so the cached balance is re-read.
  const [apply, { loading }] = useMutation<any>(APPLY_REFERRAL, {
    refetchQueries: [{ query: MY_COIN_BALANCE }],
  });
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
        <Stack data-testid="signup-referral-page" spacing={2}>
          <Stack sx={{ mb: 1 }}>
            <AuthHeading
              title={t('mweb.referral.promptTitle')}
              subtitle={t('mweb.referral.promptBodyPlain')}
            />
          </Stack>

          <TextField
            data-testid="signup-referral-code"
            label={t('mweb.referral.codeLabel')}
            placeholder={t('mweb.referral.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={malformed}
            helperText={malformed ? t('mweb.referral.validation.codePattern') : ' '}
            size="small"
            fullWidth
            slotProps={{
              htmlInput: { 'aria-label': t('mweb.referral.codeLabel'), 'data-testid': 'signup-referral-code-input' }
            }}
          />

          {error && <Alert data-testid="signup-referral-error" severity="error">{error}</Alert>}

          <DuncitButton
            data-testid="signup-referral-apply-button"
            variant="contained"
            size="large"
            fullWidth
            disabled={loading || !trimmed || malformed}
            onClick={() => {
              submit().catch(() => undefined);
            }}
          >
            {loading ? t('mweb.referral.applying') : t('mweb.referral.apply')}
          </DuncitButton>
          <DuncitButton
            data-testid="signup-referral-skip-button"
            variant="text"
            fullWidth
            onClick={() => navigate('/signup-survey')}
          >
            {t('mweb.referral.skip')}
          </DuncitButton>
        </Stack>
      </AuthScreenFrame>
    </AuthBackground>
  );
}
