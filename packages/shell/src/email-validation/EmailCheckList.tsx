import { CircularProgress, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import type { EmailValidationCheck } from '@duncit/gql-types';
import { useTranslation } from '../i18n/useTranslation';
import { CHECK_LABEL_KEYS, CHECK_ORDER } from './copy';

export interface EmailCheckListProps {
  /** The finished tests. Leave out while the check is still running. */
  checks?: ReadonlyArray<Pick<EmailValidationCheck, 'key' | 'passed'>>;
}

function OutcomeIcon({ passed }: Readonly<{ passed: boolean | null | undefined }>) {
  const { t } = useTranslation();
  if (passed === true) {
    return <CheckCircleIcon color="success" titleAccess={t('shell.emailValidation.outcome.passed')} />;
  }
  if (passed === false) {
    return <CancelIcon color="error" titleAccess={t('shell.emailValidation.outcome.failed')} />;
  }
  // Not run: a test before it failed, so there was nothing to ask.
  return <RemoveCircleOutlineIcon color="disabled" titleAccess={t('shell.emailValidation.outcome.skipped')} />;
}

/**
 * Every test behind a verdict, each with a tick, a cross or a dash. While the
 * check runs, the same list shows with a spinner on each row, so the reader
 * sees what is being asked before the answers arrive.
 */
export function EmailCheckList({ checks }: Readonly<EmailCheckListProps>) {
  const { t } = useTranslation();
  const rows = checks ?? CHECK_ORDER.map((key) => ({ key, passed: undefined }));
  return (
    <List
      dense
      disablePadding
      aria-label={t('shell.emailValidation.checksLabel')}
      aria-busy={!checks}
      data-testid="email-validation-checks"
    >
      {rows.map((check) => (
        <ListItem key={check.key} disableGutters data-testid={`email-check-${check.key.toLowerCase()}`}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {checks ? <OutcomeIcon passed={check.passed} /> : <CircularProgress size={18} aria-hidden />}
          </ListItemIcon>
          <ListItemText primary={t(CHECK_LABEL_KEYS[check.key])} />
        </ListItem>
      ))}
    </List>
  );
}
