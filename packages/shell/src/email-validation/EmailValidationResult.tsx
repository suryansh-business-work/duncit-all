import { Alert, Box, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '../i18n/useTranslation';
import { EmailCheckList } from './EmailCheckList';
import { EmailVerdictChip } from './EmailVerdictChip';
import { VERDICT_COLOR, VERDICT_HINT_KEYS } from './copy';
import type { EmailValidationResultData } from './queries';

export interface EmailValidationResultProps {
  result: EmailValidationResultData;
}

/**
 * One finished validation: the final status, what it means, a likely typo
 * fix when there is one, and every test behind it. Shared by the Validate
 * dialog in every console and Admin's log, so both read exactly alike.
 */
export function EmailValidationResult({ result }: Readonly<EmailValidationResultProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  return (
    <Stack spacing={2} data-testid="email-validation-result">
      {/* Announced once when the answer lands — the spinner list before it said "busy". */}
      <Alert
        severity={VERDICT_COLOR[result.verdict]}
        icon={false}
        role="status"
        aria-live="polite"
        data-testid="email-validation-verdict"
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle2" component="span">
            {t('shell.emailValidation.finalStatus')}
          </Typography>
          <EmailVerdictChip verdict={result.verdict} />
        </Stack>
        <Typography variant="body2">{t(VERDICT_HINT_KEYS[result.verdict])}</Typography>
      </Alert>
      {result.suggestion ? (
        <Typography variant="body2" data-testid="email-validation-suggestion">
          {t('shell.emailValidation.suggestion', { vars: { suggestion: result.suggestion } })}
        </Typography>
      ) : null}
      <Box>
        <Typography variant="subtitle2" component="h3" gutterBottom>
          {t('shell.emailValidation.checksLabel')}
        </Typography>
        <EmailCheckList checks={result.checks} />
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="email-validation-checked-at">
        {t('shell.emailValidation.checkedAt', { vars: { time: formatDateTime(result.created_at) } })}
      </Typography>
    </Stack>
  );
}
