import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useUserData } from '@duncit/user-context';
import { toGenderValue, toPetOwnerValue } from '@duncit/utils';
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
import { useUserInfo } from '../user-info/useUserInfo';
import { useTranslation } from '../i18n/useTranslation';

export default function AccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // The profile comes from USER_INFO in the cache; every save below re-reads
  // it through the provider, which is the one moment it is asked for again.
  const { logout: ctxLogout, refetch, error } = useUserData();
  const { me, loading } = useUserInfo();
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
  if (loading) {
    return (
      <Stack
        data-testid="account-loading"
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Stack>
    );
  }
  if (!me) {
    return <Alert data-testid="account-error" severity="error">{error?.message ?? 'Unable to load profile'}</Alert>;
  }

  // One order on both apps (rule 27): who you are, your details, how the
  // account is doing, then the settings, with the danger corner last.
  return (
    <Stack data-testid="account-screen" spacing={2} sx={{ maxWidth: 720, mx: 'auto', pb: 3 }}>
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
          gender: toGenderValue(me.gender),
          pet_owner: toPetOwnerValue(me.is_pet_owner),
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
        data-testid="account-page-saved-snackbar"
        open={savedOpen}
        autoHideDuration={3000}
        onClose={() => setSavedOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert data-testid="profile-saved" severity="success" variant="filled" onClose={() => setSavedOpen(false)}>
          Profile updated
        </Alert>
      </Snackbar>
    </Stack>
  );
}
