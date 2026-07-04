import { gql, useQuery } from '@apollo/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import CakeIcon from '@mui/icons-material/Cake';
import AccountInfoRow from './account-page/AccountInfoRow';
import AccountProfileHeader from './account-page/AccountProfileHeader';
import EditAccountDialog from './account-page/EditAccountDialog';
import CompletionMeter from './account-page/CompletionMeter';
import { toDobInput } from './account-page/account-edit';
import HostsVenuesCard from './account-page/HostsVenuesCard';
import PrivacyToggleCard from './account-page/PrivacyToggleCard';
import SecuritySection from './account-page/SecuritySection';
import HealthMeter from '../components/health/HealthMeter';
import { MY_ACCOUNT_HEALTH, type HealthScore } from '../components/health/queries';
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
      whatsapp_number
      whatsapp_extension
      profile_photo
      bio
      city
      state
      country
      address {
        line1
        line2
        landmark
        city
        state
        pincode
        country
      }
      dob
      roles
      profile_visibility
      created_at
    }
  }
`;

export default function AccountPage() {
  const navigate = useNavigate();
  const { logout: ctxLogout } = useUserData();
  const { data, loading, error, refetch } = useQuery(ME, { fetchPolicy: 'cache-and-network' });
  const { data: healthData } = useQuery<{ myAccountHealth: HealthScore }>(MY_ACCOUNT_HEALTH, {
    fetchPolicy: 'cache-and-network',
  });
  const health = healthData?.myAccountHealth ?? null;
  const [editOpen, setEditOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const { formatDate } = useDateFormat();

  const logout = () => {
    ctxLogout();
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
            onEdit={() => setEditOpen(true)}
            onLogout={logout}
            onChanged={() => refetch()}
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
              value={[me.city, me.state, me.country].filter(Boolean).join(' · ') || '—'}
            />
            <AccountInfoRow
              icon={<CakeIcon fontSize="small" />}
              label="Date of birth"
              value={me.dob ? formatDate(me.dob) : '—'}
            />
          </Stack>

          <Divider sx={{ my: 3 }} />

          <CompletionMeter profile={me} />
        </CardContent>
      </Card>

      {health && (
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <HealthMeter
                score={health.total_score}
                band={health.band}
                size={140}
                label="Account Health"
                onClick={() => navigate('/account/health')}
                caption="Tap for details"
              />
              <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                  {health.band === 'GREEN' ? 'You’re in great shape.' : health.band === 'YELLOW' ? 'A few things to tighten up.' : 'Needs attention.'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Base score: {health.base_score}
                  {health.delta_sum !== 0 && (
                    <>
                      {' '}· Admin adjustment: {health.delta_sum > 0 ? `+${health.delta_sum}` : health.delta_sum}
                    </>
                  )}
                </Typography>
                {health.adjustments.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {health.adjustments.length} admin remark{health.adjustments.length === 1 ? '' : 's'} — tap the meter to read.
                  </Typography>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <PrivacyToggleCard visibility={me.profile_visibility} onChanged={() => refetch()} />

      <HostsVenuesCard />

      <SecuritySection />
      <EditAccountDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={{
          first_name: me.first_name || '',
          last_name: me.last_name || '',
          bio: me.bio || '',
          dob: toDobInput(me.dob),
          city: me.city || '',
          state: me.state || '',
          country: me.country || '',
          phone_extension: me.phone_extension || '+91',
          phone_number: me.phone_number || '',
          whatsapp_extension: me.whatsapp_extension || '+91',
          whatsapp_number: me.whatsapp_number || '',
          address_line1: me.address?.line1 || '',
          address_line2: me.address?.line2 || '',
          address_landmark: me.address?.landmark || '',
          address_city: me.address?.city || '',
          address_state: me.address?.state || '',
          address_pincode: me.address?.pincode || '',
          address_country: me.address?.country || '',
        }}
        onSaved={() => {
          refetch();
          setSavedOpen(true);
        }}
      />
      <Snackbar
        open={savedOpen}
        autoHideDuration={3000}
        onClose={() => setSavedOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSavedOpen(false)}>
          Profile updated
        </Alert>
      </Snackbar>
    </Stack>
  );
}
