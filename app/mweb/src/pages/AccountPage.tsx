import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useUserData } from '@duncit/user-context';
import {
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Stack,
} from '@mui/material';
import AccountDetailsCard from './account-page/AccountDetailsCard';
import AccountHealthSummary from './account-page/AccountHealthSummary';
import AccountProfileHeader from './account-page/AccountProfileHeader';
import EditAccountDialog from './account-page/EditAccountDialog';
import { toDobInput } from './account-page/account-edit';
import PrivacyToggleCard from './account-page/PrivacyToggleCard';
import SecuritySection from './account-page/SecuritySection';
import ConnectedAccountsSection from './account-page/ConnectedAccountsSection';
import LanguageSection from './account-page/LanguageSection';
import CommPreferenceEntryCard from './account-page/comm-preference';
import { MY_ACCOUNT_HEALTH, type HealthScore } from '../components/health/queries';

const ME = gql`
  query MeProfile {
    me {
      user_id
      username
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
  const { data, loading, error, refetch } = useQuery<any>(ME, { fetchPolicy: 'cache-and-network' });
  const { data: healthData } = useQuery<{ myAccountHealth: HealthScore }>(MY_ACCOUNT_HEALTH, {
    fetchPolicy: 'cache-and-network',
  });
  const health = healthData?.myAccountHealth ?? null;
  const [editOpen, setEditOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

  const logout = () => {
    ctxLogout();
  };

  // Only a first load with nothing cached shows the spinner — `loading` alone is
  // also true on a cached revisit and on every refetch (see PodDetailsPage).
  if (loading && !data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error || !data?.me) {
    return <Alert severity="error">{error?.message ?? 'Unable to load profile'}</Alert>;
  }

  const me = data.me;
  // One order on both apps (rule 27): who you are, your details, how the
  // account is doing, then the settings, with the danger corner last.
  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto', pb: 3 }}>
      <Card>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <AccountProfileHeader
            me={me}
            onEdit={() => setEditOpen(true)}
            onLogout={logout}
            onChanged={() => refetch()}
          />
        </CardContent>
      </Card>

      <AccountDetailsCard me={me} />

      {health && <AccountHealthSummary health={health} onOpen={() => navigate('/account/health')} />}

      <PrivacyToggleCard visibility={me.profile_visibility} onChanged={() => refetch()} />

      <LanguageSection />
      {/* One row, not three cards: the channels and every switch on them
          live behind it, on /account/communication. The @handle is edited in
          Edit profile, beside the name it belongs to, and shown — with the
          link it produces — on the profile somebody goes to share. */}
      <CommPreferenceEntryCard />
      <ConnectedAccountsSection />
      <SecuritySection />
      <EditAccountDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={{
          username: me.username || '',
          first_name: me.first_name || '',
          last_name: me.last_name || '',
          bio: me.bio || '',
          dob: toDobInput(me.dob),
          city: me.city || '',
          state: me.state || '',
          country: me.country || '',
          address_line1: me.address?.line1 || '',
          address_line2: me.address?.line2 || '',
          address_landmark: me.address?.landmark || '',
          address_city: me.address?.city || '',
          address_state: me.address?.state || '',
          address_pincode: me.address?.pincode || '',
          address_country: me.address?.country || '',
        }}
        contacts={{
          email: me.email,
          phone_extension: me.phone_extension,
          phone_number: me.phone_number,
          whatsapp_extension: me.whatsapp_extension,
          whatsapp_number: me.whatsapp_number,
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
