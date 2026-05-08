import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import CakeIcon from '@mui/icons-material/Cake';
import MediaPickerDialog from '../components/MediaPickerDialog';
import AccountInfoRow from './account-page/AccountInfoRow';
import AccountProfileHeader from './account-page/AccountProfileHeader';
import EditAccountDialog from './account-page/EditAccountDialog';
import HostsVenuesCard from './account-page/HostsVenuesCard';
import { useDateFormat } from '../utils/dateFormat';

const ME = gql`
  query MeProfile {
    me {
      user_id
      first_name
      last_name
      full_name
      email
      phone_number
      phone_extension
      profile_photo
      bio
      city
      zone
      country
      dob
      roles
      status
      created_at
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateMyProfilePhoto($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      profile_photo
    }
  }
`;

export default function AccountPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(ME, { fetchPolicy: 'cache-and-network' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [updateUser] = useMutation(UPDATE_USER);
  const { formatDate } = useDateFormat();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error || !data?.me) {
    return <Alert severity="error">{error?.message ?? 'Unable to load profile'}</Alert>;
  }

  const me = data.me;
  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Card>
        <CardContent>
          <AccountProfileHeader
            me={me}
            savingPhoto={savingPhoto}
            onChangePhoto={() => setPickerOpen(true)}
            onEdit={() => setEditOpen(true)}
            onLogout={logout}
          />

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <AccountInfoRow icon={<EmailIcon fontSize="small" />} label="Email" value={me.email || '—'} />
            <AccountInfoRow
              icon={<PhoneIcon fontSize="small" />}
              label="Phone"
              value={
                me.phone_number
                  ? `${me.phone_extension || ''} ${me.phone_number}`.trim()
                  : '—'
              }
            />
            <AccountInfoRow
              icon={<LocationCityIcon fontSize="small" />}
              label="Location"
              value={[me.city, me.zone, me.country].filter(Boolean).join(' · ') || '—'}
            />
            <AccountInfoRow
              icon={<CakeIcon fontSize="small" />}
              label="Date of birth"
              value={me.dob ? formatDate(me.dob) : '—'}
            />
          </Stack>
        </CardContent>
      </Card>
      <HostsVenuesCard />
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder="/users"
        title="Update profile photo"
        onPicked={async (url) => {
          setSavingPhoto(true);
          setPhotoError(null);
          try {
            await updateUser({
              variables: { input: { profile_photo: url } },
            });
            await refetch();
          } catch (e: any) {
            setPhotoError(e.message ?? 'Could not update profile photo');
          } finally {
            setSavingPhoto(false);
          }
        }}
      />
      {photoError && <Alert severity="error" onClose={() => setPhotoError(null)}>{photoError}</Alert>}
      <EditAccountDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={{
          first_name: me.first_name || '',
          last_name: me.last_name || '',
          bio: me.bio || '',
          city: me.city || '',
          zone: me.zone || '',
          country: me.country || '',
          phone_extension: me.phone_extension || '+91',
          phone_number: me.phone_number || '',
          whatsapp_extension: me.whatsapp_extension || '+91',
          whatsapp_number: me.whatsapp_number || '',
        }}
        onSaved={() => refetch()}
      />
    </Stack>
  );
}
