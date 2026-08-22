import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Stack } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import {
  GRIEVANCE_OFFICER_SDL,
  SUBMIT_GRIEVANCE_SDL,
  grievanceSupportTicketOptions,
  type PublicGrievanceOfficer,
  type SubmittedGrievance,
} from '@duncit/utils';
import SupportShell from './SupportShell';
import GrievanceOfficerCard from './GrievanceOfficerCard';
import { MY_UNIFIED_SUPPORT_TICKETS } from './queries';
import { useTranslation } from '../../i18n/useTranslation';
import GrievanceForm, { GrievanceEscalationNotice, type GrievanceValues } from '../../forms/grievance';

const SUBMIT_GRIEVANCE = gql(SUBMIT_GRIEVANCE_SDL);
const GRIEVANCE_OFFICER = gql(GRIEVANCE_OFFICER_SDL);

/** Only the two fields the dropdown needs — the rest of the unified row is the
 *  All Support Tickets list's business. */
interface TicketRow {
  ticket_no: string;
  title: string;
}

/**
 * Raise a grievance — the mWeb twin of the native GrievanceScreen.
 *
 * The page states the escalation ladder before the form: support first, the
 * Grievance Officer only after support could not settle it. That is not advice
 * — a grievance with no support ticket behind it is rejected — so the person
 * reads it before they start typing, and the form then asks them to point at
 * the ticket they are escalating.
 *
 * The reference number is what they leave with: it is on screen the moment the
 * grievance lands and in the email a second later, and it is the only thing
 * they can quote when they chase it.
 */
export default function GrievancePage() {
  const { t } = useTranslation();
  const [submit, { loading }] = useMutation(SUBMIT_GRIEVANCE);
  const { data } = useQuery<{ grievanceOfficer: PublicGrievanceOfficer }>(GRIEVANCE_OFFICER);
  const { data: ticketData, loading: ticketsLoading } = useQuery<{
    myUnifiedSupportTickets: TicketRow[];
  }>(MY_UNIFIED_SUPPORT_TICKETS, { fetchPolicy: 'cache-and-network' });
  const [sent, setSent] = useState<SubmittedGrievance | null>(null);

  // Built by the shared helper so the option the native app stores and the one
  // mWeb stores are the same string (rule 40).
  const tickets = useMemo(
    () => grievanceSupportTicketOptions(ticketData?.myUnifiedSupportTickets ?? []),
    [ticketData]
  );

  const onSubmit = async (values: GrievanceValues) => {
    const res = await submit({ variables: { input: { ...values, source: 'APP' } } });
    setSent(res.data?.submitGrievance ?? null);
  };

  return (
    <SupportShell
      title={t('grievance.title')}
      subtitle={t('grievance.subtitle')}
      icon={<GavelIcon />}
      backTo="/support"
    >
      <Stack spacing={2}>
        {sent ? (
          <>
            <Alert severity="success">
              <strong>{t('grievance.successTitle')}</strong>
              <div>{t('grievance.successBody')}</div>
              <div>
                {t('grievance.referenceLabel')}: <strong>{sent.grievance_no}</strong>
              </div>
            </Alert>
            <Button variant="outlined" onClick={() => setSent(null)}>
              {t('grievance.raiseAnother')}
            </Button>
          </>
        ) : (
          <>
            <GrievanceEscalationNotice />
            <GrievanceForm
              loading={loading}
              tickets={tickets}
              ticketsLoading={ticketsLoading}
              onSubmit={onSubmit}
            />
          </>
        )}
        <GrievanceOfficerCard officer={data?.grievanceOfficer} />
      </Stack>
    </SupportShell>
  );
}
