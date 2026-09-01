import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import {
  GRIEVANCE_OFFICER,
  SAVE_GRIEVANCE_OFFICER,
  type GrievanceOfficer,
} from '../../graphql/grievance';
import {
  EMPTY_GRIEVANCE_OFFICER,
  GrievanceOfficerForm,
  type GrievanceOfficerFormValues,
} from './grievance-officer-form';
import { useTranslation } from '@duncit/shell';

export default function GrievanceInfoPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const { data, refetch } = useQuery<{ grievanceOfficer: GrievanceOfficer }>(GRIEVANCE_OFFICER, {
    fetchPolicy: 'network-only',
  });
  const [saveMut, { loading: saving }] = useMutation<any>(SAVE_GRIEVANCE_OFFICER);
  const [error, setError] = useState<string | null>(null);

  const officer = data?.grievanceOfficer;

  // A new object every render would reset the form on every keystroke, so the
  // seed only changes when the saved values do.
  const initialValues = useMemo<GrievanceOfficerFormValues>(
    () =>
      officer
        ? {
            name: officer.name,
            email: officer.email,
            phone: officer.phone,
            address: officer.address,
          }
        : EMPTY_GRIEVANCE_OFFICER,
    [officer],
  );

  const updatedAt = officer?.updated_at ? formatDateTime(new Date(officer.updated_at)) : '';
  const published = !!officer?.name;

  const submit = async (values: GrievanceOfficerFormValues) => {
    setError(null);
    try {
      await saveMut({ variables: { input: values } });
      notifySuccess('Grievance Officer updated');
      await refetch();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('legal.grievance.infoTitle')}
        subtitle={t('legal.grievance.infoSubtitle')}
      />

      {!published && (
        <Alert severity="warning">
          No Grievance Officer is published yet. Until these details are saved, the app and website
          show a placeholder instead of a name.
        </Alert>
      )}

      <GrievanceOfficerForm
        initialValues={initialValues}
        saving={saving}
        error={error}
        updatedAt={updatedAt}
        onSubmit={submit}
      />
    </Stack>
  );
}
