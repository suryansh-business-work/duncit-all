import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import {
  ClubEditorPage,
  blankClubFormValues,
  buildClubInput,
  clubToFormValues,
  type ClubFormConfig,
  type ClubFormValues,
} from '@duncit/club-form';
import { notifySuccess } from '@duncit/dialogs';
import { QueryGuard } from '@duncit/ui';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { CLUB_ADMIN_UPDATE_CLUB, CLUB_FOR_EDIT } from './queries';
import { useTranslation } from '@duncit/shell';

// Club admins edit page content only — governance fields stay admin-only.
const PARTNER_CLUB_CONFIG: ClubFormConfig = {
  showAdmins: false,
  showVerified: false,
  showIsActive: false,
};

export default function ClubAdminEditClubPage() {
  const { t } = useTranslation();
  const { clubId = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<any>(CLUB_FOR_EDIT, {
    variables: { club_doc_id: clubId },
    fetchPolicy: 'cache-and-network',
  });
  const [updateClub, updateState] = useMutation<any>(CLUB_ADMIN_UPDATE_CLUB);
  const [opError, setOpError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFolder, setPickerFolder] = useState('/clubs');
  const pickerResolve = useRef<((url: string | null) => void) | null>(null);
  const pickImage = (folder = '/clubs') =>
    new Promise<string | null>((resolve) => {
      pickerResolve.current = resolve;
      setPickerFolder(folder);
      setPickerOpen(true);
    });
  const settlePicker = (url: string | null) => {
    pickerResolve.current?.(url);
    pickerResolve.current = null;
    setPickerOpen(false);
  };

  const club = data?.club;
  const backTo = `/club-admin/clubs/${clubId}`;
  const initialValues: ClubFormValues = useMemo(
    () => (club ? clubToFormValues(club) : blankClubFormValues),
    [club],
  );

  const submit = async (values: ClubFormValues) => {
    setOpError(null);
    const input = buildClubInput(values, { config: PARTNER_CLUB_CONFIG });
    try {
      await updateClub({ variables: { club_doc_id: clubId, input } });
      notifySuccess('Club details updated.');
      navigate(backTo);
    } catch (submitError: any) {
      setOpError(submitError.message);
    }
  };

  return (
    <>
      <QueryGuard
        loading={loading && !club}
        error={error}
        errorText={error?.message}
        notFound={!club}
        notFoundText="Club not found."
        notFoundSeverity="warning"
      >
        {() => (
          <ClubEditorPage
            eyebrow="Club Admin · Edit"
            heading={club.club_name}
            onBack={() => navigate(backTo)}
            backLabel="Back to pods"
            initialValues={initialValues}
            config={PARTNER_CLUB_CONFIG}
            busy={updateState.loading}
            error={opError}
            onSubmit={submit}
            onPickImage={pickImage}
          />
        )}
      </QueryGuard>

      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => settlePicker(null)}
        onPicked={(url) => settlePicker(url)}
        folder={pickerFolder}
        title={t('partners.clubAdminEditClubPage.addClubImage')}
      />
    </>
  );
}
