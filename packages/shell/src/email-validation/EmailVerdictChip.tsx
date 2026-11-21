import { Chip } from '@mui/material';
import type { EmailValidationVerdict } from '@duncit/gql-types';
import { useTranslation } from '../i18n/useTranslation';
import { VERDICT_COLOR, VERDICT_LABEL_KEYS } from './copy';

export interface EmailVerdictChipProps {
  verdict: EmailValidationVerdict;
  size?: 'small' | 'medium';
}

/** An address's final status — Valid, Risky or Invalid — in its colour. */
export function EmailVerdictChip({ verdict, size = 'small' }: Readonly<EmailVerdictChipProps>) {
  const { t } = useTranslation();
  return (
    <Chip
      size={size}
      color={VERDICT_COLOR[verdict]}
      label={t(VERDICT_LABEL_KEYS[verdict])}
      data-testid={`email-verdict-${verdict.toLowerCase()}`}
    />
  );
}
