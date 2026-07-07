import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, CardContent, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  ClubForm,
  blankClubFormValues,
  buildClubInput,
  clubToFormValues,
  type ClubFormConfig,
  type ClubFormValues,
} from '@duncit/club-form';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { CLUB_ADMIN_UPDATE_CLUB, CLUB_FOR_EDIT } from './queries';

// Club admins edit page content only — governance fields stay admin-only.
const PARTNER_CLUB_CONFIG: ClubFormConfig = {
  showAdmins: false,
  showVerified: false,
  showIsActive: false,
};

export default function ClubAdminEditClubPage() {
  const { clubId = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(CLUB_FOR_EDIT, {
    variables: { club_doc_id: clubId },
    fetchPolicy: 'cache-and-network',
  });
  const [updateClub, updateState] = useMutation(CLUB_ADMIN_UPDATE_CLUB);
  const [opError, setOpError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage('Club details updated.');
      navigate(backTo);
    } catch (submitError: any) {
      setOpError(submitError.message);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
            <Stack spacing={0.25}>
              <Typography variant="overline" color="text.secondary" fontWeight={800}>Club Admin · Edit</Typography>
              <Typography variant="h6" fontWeight={950}>{club?.club_name ?? 'Edit club details'}</Typography>
              <Typography variant="body2" color="text.secondary">Update your club's page content and links.</Typography>
            </Stack>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backTo)}>Back to pods</Button>
          </Stack>
          {error && <Alert severity="error">{error.message}</Alert>}
          {loading && !club && (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          )}
          {club && (
            <ClubForm
              initialValues={initialValues}
              config={PARTNER_CLUB_CONFIG}
              onPickImage={pickImage}
              busy={updateState.loading}
              error={opError}
              onCancel={() => navigate(backTo)}
              onSubmit={submit}
            />
          )}
        </Stack>
      </CardContent>

      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => settlePicker(null)}
        onPicked={(url) => settlePicker(url)}
        folder={pickerFolder}
        title="Add club image"
      />
      <Snackbar open={!!message} autoHideDuration={2500} message={message ?? ''} onClose={() => setMessage(null)} />
    </Card>
  );
}
