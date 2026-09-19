import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useDateFormat } from '@duncit/app-settings';
import type { LiteRegistration } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';

interface Step {
  key: string;
  done: boolean;
  at: string | null;
}

const PAST_APPROVAL = new Set(['PAYMENT_PENDING', 'CONFIRMED']);

/** The steps a registration passes through, and which ones this one has cleared. */
function stepsFor(registration: LiteRegistration, requiresApproval: boolean): Step[] {
  const steps: Step[] = [{ key: 'registered', done: true, at: registration.created_at }];
  if (requiresApproval) steps.push({ key: 'approved', done: PAST_APPROVAL.has(registration.status), at: null });
  if (registration.amount_due > 0) steps.push({ key: 'paid', done: registration.payment_status === 'PAID', at: registration.payment_confirmed_at });
  steps.push({ key: 'confirmed', done: registration.status === 'CONFIRMED', at: null }, { key: 'checkedIn', done: registration.checked_in_at !== null, at: registration.checked_in_at });
  return steps;
}

export function StatusTimeline({ registration, requiresApproval }: Readonly<{ registration: LiteRegistration; requiresApproval: boolean }>) {
  const { t } = useWebT();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  return (
    <List dense disablePadding data-testid="status-timeline">
      {stepsFor(registration, requiresApproval).map((step) => (
        <ListItem key={step.key} disableGutters>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {step.done ? <CheckCircleIcon color="success" aria-hidden /> : <RadioButtonUncheckedIcon color="disabled" aria-hidden />}
          </ListItemIcon>
          <ListItemText
            primary={t(`liteWeb.ticket.steps.${step.key}`)}
            secondary={step.done && step.at ? formatDateTime(step.at) : undefined}
            slotProps={{ primary: { sx: { fontWeight: step.done ? 700 : 400, color: step.done ? 'text.primary' : 'text.secondary' } } }}
          />
        </ListItem>
      ))}
    </List>
  );
}
