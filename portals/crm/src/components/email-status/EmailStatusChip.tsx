import type { MouseEvent, ReactElement } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import { Tooltip } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { EmailStatus } from '../../api/emailVerification.gql';

const STATUS_COLORS: StatusColorMap = {
  VERIFIED: 'success',
  RISKY: 'warning',
  INVALID: 'error',
  UNKNOWN: 'default',
  NOT_CHECKED: 'default',
};

/** Literal keys per status, so the localization gate can see every one. */
export const EMAIL_STATUS_COPY: Readonly<Record<EmailStatus, string>> = {
  VERIFIED: 'crm.emailVerifier.statusVerified',
  RISKY: 'crm.emailVerifier.statusRisky',
  INVALID: 'crm.emailVerifier.statusInvalid',
  UNKNOWN: 'crm.emailVerifier.statusUnknown',
  NOT_CHECKED: 'crm.emailVerifier.statusNotChecked',
};

const STATUS_ICON: Readonly<Record<EmailStatus, ReactElement>> = {
  VERIFIED: <CheckCircleIcon />,
  RISKY: <ErrorOutlineIcon />,
  INVALID: <CancelIcon />,
  UNKNOWN: <HelpOutlineIcon />,
  NOT_CHECKED: <MarkEmailUnreadOutlinedIcon />,
};

export interface EmailStatusChipProps {
  status: EmailStatus;
  tooltip?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

/** How an email's status looks everywhere — a green tick for VERIFIED. */
export function EmailStatusChip({ status, tooltip, onClick }: Readonly<EmailStatusChipProps>) {
  const { t } = useTranslation();
  const chip = (
    <StatusChip
      status={status}
      colorMap={STATUS_COLORS}
      label={t(EMAIL_STATUS_COPY[status])}
      icon={STATUS_ICON[status]}
      variant={status === 'NOT_CHECKED' ? 'outlined' : 'filled'}
      onClick={onClick}
      data-testid={`email-status-${status.toLowerCase()}`}
      sx={{ flexShrink: 0 }}
    />
  );
  return tooltip ? <Tooltip title={tooltip}>{chip}</Tooltip> : chip;
}
