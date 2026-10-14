import { Alert, Box, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '@duncit/shell';
import type { CrmEmailVerification } from '../../../api/emailVerification.gql';
import { EmailStatusChip } from '../../../components/email-status';

type Flag = keyof Pick<
  CrmEmailVerification,
  'is_valid_syntax' | 'accepts_mail' | 'is_deliverable' | 'is_catch_all' | 'is_disposable' | 'is_role_account'
>;

/** Literal keys, so the localization gate sees each. */
const FLAG_COPY: ReadonlyArray<{ flag: Flag; key: string }> = [
  { flag: 'is_valid_syntax', key: 'crm.emailVerifier.flagSyntax' },
  { flag: 'accepts_mail', key: 'crm.emailVerifier.flagAcceptsMail' },
  { flag: 'is_deliverable', key: 'crm.emailVerifier.flagDeliverable' },
  { flag: 'is_catch_all', key: 'crm.emailVerifier.flagCatchAll' },
  { flag: 'is_disposable', key: 'crm.emailVerifier.flagDisposable' },
  { flag: 'is_role_account', key: 'crm.emailVerifier.flagRoleAccount' },
];

/** What one check found: the verdict and the facts behind it. */
export function VerificationResult({ result }: Readonly<{ result: CrmEmailVerification }>) {
  const { t } = useTranslation();
  return (
    <Box data-testid="email-verify-result" aria-live="polite">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
          {result.email}
        </Typography>
        <EmailStatusChip status={result.status} />
      </Stack>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {FLAG_COPY.map(({ flag, key }) => (
          <Stack component="li" key={flag} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            {result[flag] ? (
              <CheckIcon fontSize="small" color="success" aria-hidden />
            ) : (
              <CloseIcon fontSize="small" color="disabled" aria-hidden />
            )}
            <Typography variant="body2">
              {t(key)}: {result[flag] ? t('crm.emailVerifier.yes') : t('crm.emailVerifier.no')}
            </Typography>
          </Stack>
        ))}
      </Box>
      {result.suggestion && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {t('crm.emailVerifier.didYouMean', { vars: { email: result.suggestion } })}
        </Alert>
      )}
    </Box>
  );
}
