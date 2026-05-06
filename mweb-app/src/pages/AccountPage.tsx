import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import CakeIcon from '@mui/icons-material/Cake';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MediaPickerDialog from '../components/MediaPickerDialog';

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
  mutation UpdatePhoto($user_id: ID!, $input: UpdateUserInput!) {
    updateUser(user_id: $user_id, input: $input) {
      user_id
      profile_photo
    }
  }
`;

export default function AccountPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(ME, { fetchPolicy: 'cache-and-network' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [updateUser] = useMutation(UPDATE_USER);

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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={me.profile_photo || undefined}
                sx={{ width: 96, height: 96, bgcolor: 'primary.main', fontSize: 36 }}
              >
                {(me.first_name?.[0] ?? 'U').toUpperCase()}
              </Avatar>
              <Tooltip title="Change photo">
                <IconButton
                  size="small"
                  onClick={() => setPickerOpen(true)}
                  disabled={savingPhoto}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {savingPhoto ? <CircularProgress size={16} /> : <PhotoCameraIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h5" fontWeight={700}>
                {me.full_name || `${me.first_name} ${me.last_name}`}
              </Typography>
              {me.bio && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {me.bio}
                </Typography>
              )}
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1.5, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}
              >
                {me.roles?.map((r: string) => (
                  <Chip key={r} label={r} size="small" color="primary" variant="outlined" />
                ))}
                {me.status && <Chip label={me.status} size="small" />}
              </Stack>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={logout}
            >
              Logout
            </Button>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Row icon={<EmailIcon fontSize="small" />} label="Email" value={me.email || '—'} />
            <Row
              icon={<PhoneIcon fontSize="small" />}
              label="Phone"
              value={
                me.phone_number
                  ? `${me.phone_extension || ''} ${me.phone_number}`.trim()
                  : '—'
              }
            />
            <Row
              icon={<LocationCityIcon fontSize="small" />}
              label="Location"
              value={[me.city, me.zone, me.country].filter(Boolean).join(' · ') || '—'}
            />
            <Row
              icon={<CakeIcon fontSize="small" />}
              label="Date of birth"
              value={me.dob ? new Date(me.dob).toLocaleDateString() : '—'}
            />
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardActionArea component={RouterLink} to="/hosts-venues">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <StorefrontIcon />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Hosts &amp; Venues
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Discover Duncit hosts &amp; venues — and start your onboarding here.
                </Typography>
              </Box>
              <ChevronRightIcon color="action" />
            </Stack>
          </CardContent>
        </CardActionArea>
        <Divider />
        <CardContent>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              component={RouterLink}
              to="/become-host"
              variant="outlined"
              size="small"
              startIcon={<GroupAddIcon />}
            >
              Become a Host
            </Button>
            <Button
              component={RouterLink}
              to="/register-venue"
              variant="outlined"
              size="small"
              startIcon={<AddBusinessIcon />}
            >
              Register Venue
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder="/users"
        title="Update profile photo"
        onPicked={async (url) => {
          setSavingPhoto(true);
          try {
            await updateUser({
              variables: { user_id: me.user_id, input: { profile_photo: url } },
            });
            await refetch();
          } finally {
            setSavingPhoto(false);
          }
        }}
      />
    </Stack>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1">{value}</Typography>
      </Box>
    </Stack>
  );
}
