import { Link as RouterLink } from 'react-router';
import type { Control } from 'react-hook-form';
import { Alert, AlertTitle, MenuItem } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { DuncitButton } from '@duncit/buttons';
import { grievanceTicketFieldCopy } from '@duncit/i18n';
import type { GrievanceSupportTicketOption } from '@duncit/utils';
import RhfTextField from '../components/RhfTextField';
import { useTranslation } from '../../i18n/useTranslation';
import type { GrievanceValues } from './grievance.types';

interface Props {
  control: Control<GrievanceValues>;
  /** The user's own support history, newest first. */
  options: GrievanceSupportTicketOption[];
  loading?: boolean;
}

/** Where a person goes to start the step this field is asking them to have taken. */
const CREATE_TICKET_PATH = '/support/tickets';

/**
 * Pick the support ticket this grievance escalates.
 *
 * A dropdown rather than a box to type in, because mWeb knows who is signed in
 * and can therefore offer the person's real tickets — a typed reference is a
 * reference that can be wrong, and the officer would be hunting for a ticket
 * number that never existed. The website, which has nobody signed in, is the
 * one surface that still asks for it as free text.
 *
 * With no tickets at all there is nothing to escalate, so the field is replaced
 * by the way forward: raise a support ticket first.
 */
export default function SupportTicketField({ control, options, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = grievanceTicketFieldCopy(t);

  if (!loading && options.length === 0) {
    return (
      <Alert
        severity="warning"
        action={
          <DuncitButton
            component={RouterLink}
            to={CREATE_TICKET_PATH}
            size="small"
            color="inherit"
            startIcon={<ConfirmationNumberIcon fontSize="small" />}
          >
            {copy.emptyCta}
          </DuncitButton>
        }
      >
        <AlertTitle>{copy.emptyTitle}</AlertTitle>
        {copy.emptyBody}
      </Alert>
    );
  }

  return (
    <RhfTextField
      control={control}
      name="support_ticket_ref"
      label={copy.label}
      hint={copy.selectHint}
      disabled={loading}
      required
      select
      // MUI reads an empty value as "nothing chosen" and would otherwise leave
      // the label sitting on top of the placeholder.
      slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true, renderValue: renderValue(options, copy.placeholder) } }}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </RhfTextField>
  );
}

/**
 * What the closed dropdown shows.
 *
 * Hoisted out of the JSX so the empty-value branch sits at nesting zero, and so
 * a chosen ticket reads back as the same `NO · title` line it was picked from
 * rather than as the bare reference.
 */
function renderValue(options: GrievanceSupportTicketOption[], placeholder: string) {
  return (value: unknown) => {
    const chosen = options.find((option) => option.value === value);
    return chosen?.label ?? placeholder;
  };
}
