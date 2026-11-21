import type { MouseEvent } from 'react';
import { Tooltip } from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { isEmail } from '@duncit/regex';
import { useTranslation } from '../i18n/useTranslation';
import { useEmailValidation } from './emailValidationContext';

export interface EmailValidateButtonProps {
  email: string | null | undefined;
}

/**
 * The Validate button beside an email address, in any console. Opens the
 * shell's dialog, which runs every check and logs the result to Admin › Email
 * Validations. Renders nothing for a blank or malformed value, or outside a
 * signed-in console.
 */
export function EmailValidateButton({ email }: Readonly<EmailValidateButtonProps>) {
  const { t } = useTranslation();
  const api = useEmailValidation();
  const address = email?.trim() ?? '';
  if (!api || !isEmail(address)) return null;

  const onClick = (event: MouseEvent) => {
    // Inside a table row or a clickable card, the click is this button's alone.
    event.stopPropagation();
    api.open(address);
  };

  // The tooltip names the address: MUI writes its title over the button's aria-label.
  return (
    <Tooltip title={t('shell.emailValidation.validateNamed', { vars: { email: address } })}>
      <DuncitIconButton size="small" onClick={onClick} data-testid="email-validate-button">
        <FactCheckOutlinedIcon fontSize="small" />
      </DuncitIconButton>
    </Tooltip>
  );
}
