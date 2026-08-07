import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Stack } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import {
  GRIEVANCE_OFFICER_SDL,
  SUBMIT_GRIEVANCE_SDL,
  type PublicGrievanceOfficer,
  type SubmittedGrievance,
} from '@duncit/utils';
import SupportShell from './SupportShell';
import GrievanceOfficerCard from './GrievanceOfficerCard';
import { useTranslation } from '../../i18n/useTranslation';
import GrievanceForm, { type GrievanceValues } from '../../forms/grievance';

const SUBMIT_GRIEVANCE = gql(SUBMIT_GRIEVANCE_SDL);
const GRIEVANCE_OFFICER = gql(GRIEVANCE_OFFICER_SDL);

/**
 * Raise a grievance — the mWeb twin of the native GrievanceScreen.
 *
 * The reference number is what the person leaves with: it is on screen the
 * moment the grievance lands and in the email a second later, and it is the
 * only thing they can quote when they chase it.
 */
export default function GrievancePage() {
  const { t } = useTranslation();
  const [submit, { loading }] = useMutation(SUBMIT_GRIEVANCE);
  const { data } = useQuery<{ grievanceOfficer: PublicGrievanceOfficer }>(GRIEVANCE_OFFICER);
  const [sent, setSent] = useState<SubmittedGrievance | null>(null);

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
          <GrievanceForm loading={loading} onSubmit={onSubmit} />
        )}
        <GrievanceOfficerCard officer={data?.grievanceOfficer} />
      </Stack>
    </SupportShell>
  );
}
