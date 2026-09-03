import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Box } from '@mui/material';
import {
  ClubEditorPage,
  blankClubFormValues,
  buildClubInput,
  clubToFormValues,
  type ClubFormConfig,
  type ClubFormValues,
} from '@duncit/club-form';
import { useMediaPickerBridge } from '@duncit/pod-form';
import { QueryGuard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { notifySuccess } from '../../components/notify';
import { MWEB_CLUB_ADMIN_UPDATE_CLUB, MWEB_CLUB_FOR_EDIT } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/** Page content only — the governance sections are the platform admin's. */
const CLUB_ADMIN_CLUB_CONFIG: ClubFormConfig = {
  showAdmins: false,
  showVerified: false,
  showIsActive: false,
};

/**
 * Edit one of the clubs the signed-in admin runs — the SAME editor the
 * Partners console mounts (`@duncit/club-form`, rule 40), saved through
 * `clubAdminUpdateClub`. Native twin: ClubEdit (rule 27).
 */
export default function ClubEditPage() {
  const { t } = useTranslation();
  const { clubId = '' } = useParams();
  const navigate = useNavigate();
  const backTo = `/clubs/${clubId}/pods`;
  const picker = useMediaPickerBridge();
  const [opError, setOpError] = useState<string | null>(null);

  const { data, loading, error } = useQuery<any>(MWEB_CLUB_FOR_EDIT, {
    variables: { club_doc_id: clubId },
    fetchPolicy: 'cache-and-network',
  });
  const [updateClub, updateState] = useMutation<any>(MWEB_CLUB_ADMIN_UPDATE_CLUB);
  const club = data?.club;
  const initialValues: ClubFormValues = useMemo(
    () => (club ? clubToFormValues(club) : blankClubFormValues),
    [club],
  );

  const submit = async (values: ClubFormValues) => {
    setOpError(null);
    const input = buildClubInput(values, { config: CLUB_ADMIN_CLUB_CONFIG });
    try {
      await updateClub({ variables: { club_doc_id: clubId, input } });
      notifySuccess(t('clubAdmin.editClub.saved'));
      navigate(backTo);
    } catch (caught) {
      setOpError(parseApiError(caught));
    }
  };

  // Everything the editor needs that does not depend on the club having
  // arrived; the heading and the back route join it once the guard passes.
  const editorProps = {
    config: CLUB_ADMIN_CLUB_CONFIG,
    initialValues,
    busy: updateState.loading,
    error: opError,
    onSubmit: submit,
    onPickImage: () => picker.pickImage(),
    backLabel: t('clubAdmin.editClub.backToPods'),
    eyebrow: t('clubAdmin.editClub.eyebrow'),
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
      <QueryGuard
        notFound={!club}
        notFoundText={t('clubAdmin.editClub.notFound')}
        notFoundSeverity="warning"
        loading={loading && !club}
        error={error}
        errorText={error?.message}
      >
        {() => (
          <ClubEditorPage heading={club.club_name} onBack={() => navigate(backTo)} {...editorProps} />
        )}
      </QueryGuard>

      <MediaPickerDialog
        open={picker.pickerOpen}
        onClose={() => picker.settlePicker(null)}
        onPicked={(url) => picker.settlePicker(url)}
        folder="/clubs"
        title={t('clubAdmin.editClub.addImage')}
      />
    </Box>
  );
}
