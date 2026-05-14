import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, AppBar, Avatar, Box, IconButton, Toolbar, Tooltip } from '@mui/material';
import { HEADER_DATA, PUBLIC_POLICIES } from './queries';
import HeaderBrand from './HeaderBrand';
import HeaderLocationButton from './HeaderLocationButton';
import HeaderNotificationsBell from './HeaderNotificationsBell';
import HeaderToast from './HeaderToast';
import LocationDialog from './LocationDialog';
import ProfileDrawer from './ProfileDrawer';
import SuperCategoryTabs from './SuperCategoryTabs';

interface AppHeaderProps {
  selectedSuperCategory: string;
  onSuperCategoryChange: (slug: string) => void;
  selectedLocationId: string;
  onLocationChange: (id: string) => void;
  selectedZoneName: string;
  onZoneChange: (zone: string) => void;
}

export default function AppHeader({
  selectedSuperCategory,
  onSuperCategoryChange,
  selectedLocationId,
  onLocationChange,
  selectedZoneName,
  onZoneChange,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { data, loading } = useQuery(HEADER_DATA, { fetchPolicy: 'cache-and-network' });
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [draftLocationId, setDraftLocationId] = useState('');
  const [draftZone, setDraftZone] = useState('');
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [toast, setToast] = useState<{ title?: string; body?: string } | null>(null);

  const branding = data?.branding;
  const me = data?.me;
  const superCats = data?.superCategories ?? [];
  const locations = data?.locations ?? [];
  const superCategoryValue = selectedSuperCategory || superCats[0]?.slug || '';

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      const cityMatch = locations.find(
        (l: any) => me?.city && l.location_name?.toLowerCase() === me.city.toLowerCase()
      );
      onLocationChange(cityMatch?.id ?? locations[0].id);
    }
  }, [locations, selectedLocationId, me, onLocationChange]);

  useEffect(() => {
    if (!selectedSuperCategory && superCats.length > 0) {
      onSuperCategoryChange(superCats[0].slug);
    }
  }, [superCats, selectedSuperCategory, onSuperCategoryChange]);

  const selectedLocation = useMemo(
    () => locations.find((l: any) => l.id === selectedLocationId),
    [locations, selectedLocationId]
  );

  const { data: policiesData } = useQuery(PUBLIC_POLICIES, { fetchPolicy: 'cache-first' });
  const publicPolicies = policiesData?.publicPolicies ?? [];

  const logout = () => {
    setProfileAnchor(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleNotifToast = useCallback(
    (t: { title?: string; body?: string } | null) => setToast(t),
    []
  );

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ gap: 1, py: 1, minHeight: 64, px: 2 }}>
        <HeaderBrand logoUrl={branding?.logo_url} appName={branding?.app_name} />

        <Box sx={{ flexGrow: 1 }} />

        <HeaderLocationButton
          loading={loading}
          hasData={!!data}
          selectedLocationName={selectedLocation?.location_name}
          selectedZoneName={selectedZoneName}
          onClick={() => {
            setDraftLocationId(selectedLocationId);
            setDraftZone(selectedZoneName);
            setLocDialogOpen(true);
          }}
        />
        <LocationDialog
          open={locDialogOpen}
          onClose={() => setLocDialogOpen(false)}
          locations={locations}
          draftLocationId={draftLocationId}
          setDraftLocationId={setDraftLocationId}
          draftZone={draftZone}
          setDraftZone={setDraftZone}
          onApply={() => {
            onLocationChange(draftLocationId);
            onZoneChange(draftZone);
            setLocDialogOpen(false);
          }}
        />

        <HeaderNotificationsBell onToast={handleNotifToast} />

        <Tooltip title={me?.full_name ?? 'Account'}>
          <IconButton
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            sx={{ p: 0.25, minWidth: 44, minHeight: 44 }}
            aria-label="Open account menu"
          >
            <Avatar
              src={me?.profile_photo || undefined}
              sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 13 }}
            >
              {(me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase()}
            </Avatar>
          </IconButton>
        </Tooltip>
        <ProfileDrawer
          open={!!profileAnchor}
          onClose={() => setProfileAnchor(null)}
          me={me}
          publicPolicies={publicPolicies}
          policiesOpen={policiesOpen}
          setPoliciesOpen={setPoliciesOpen}
          onLogout={logout}
        />
      </Toolbar>

      {me?.email && me.is_email_verified === false && (
        <Alert
          severity="info"
          onClick={() => navigate('/profile?verifyEmail=1')}
          sx={{ borderRadius: 0, cursor: 'pointer', py: 0.25 }}
        >
          Please verify your email
        </Alert>
      )}

      <SuperCategoryTabs
        loading={loading}
        superCats={superCats}
        value={superCategoryValue}
        onChange={onSuperCategoryChange}
      />

      <HeaderToast toast={toast} onClose={() => setToast(null)} />
    </AppBar>
  );
}
