import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { Alert, AppBar, Avatar, Box, Chip, IconButton, Toolbar, Tooltip } from '@mui/material';
import { HEADER_DATA, PUBLIC_POLICIES } from './queries';
import HeaderBrand from './HeaderBrand';
import HeaderMascotButton from './HeaderMascotButton';
import HeaderLocationButton from './HeaderLocationButton';
import HeaderNotificationsBell from './HeaderNotificationsBell';
import HeaderSearchButton from './HeaderSearchButton';
import HeaderToast from './HeaderToast';
import LocationDialog from './LocationDialog';
import ProfileDrawer from './ProfileDrawer';
import StudioSwitchDialog from './profile-drawer/StudioSwitchDialog';
import SuperCategoryTabs from './SuperCategoryTabs';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import SurveyHeaderActions from './SurveyHeaderActions';
import { useStudioMode } from '../../StudioModeContext';
import { STUDIO_HOME_PATH, STUDIO_LABEL, resolveMode } from '../../studio-mode';

interface AppHeaderProps {
  minimal?: boolean;
  selectedSuperCategory: string;
  onSuperCategoryChange: (slug: string) => void;
  selectedLocationId: string;
  onLocationChange: (id: string) => void;
  selectedZoneName: string;
  onZoneChange: (zone: string) => void;
}

export default function AppHeader({
  minimal = false,
  selectedSuperCategory,
  onSuperCategoryChange,
  selectedLocationId,
  onLocationChange,
  selectedZoneName,
  onZoneChange,
}: Readonly<AppHeaderProps>) {
  const navigate = useNavigate();
  const { logout: ctxLogout } = useUserData();
  const { data, loading } = useQuery(HEADER_DATA, { fetchPolicy: 'cache-and-network' });
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [draftLocationId, setDraftLocationId] = useState('');
  const [draftZone, setDraftZone] = useState('');
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [toast, setToast] = useState<{ title?: string; body?: string } | null>(null);
  const { mode: studioMode, setMode: setStudioMode } = useStudioMode();
  const [studioSwitchOpen, setStudioSwitchOpen] = useState(false);

  const branding = data?.branding;
  const me = data?.me;
  const effectiveStudio = resolveMode(studioMode, me?.roles ?? []);
  // The shared <UserProvider> auto-mounts a global "User data not loaded"
  // dialog when the `me` query fails, so we no longer render a local one
  // here. Keeping `me`/`loading` for the rest of the header's logic.
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
    ctxLogout();
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
      sx={{
        bgcolor: 'transparent',
        backgroundImage: 'none',
        borderBottom: 0,
        backdropFilter: 'blur(18px)',
      }}
    >
      <Toolbar sx={{ width: '100%', maxWidth: APP_SHELL_MAX_WIDTH, mx: 'auto', gap: 1, py: 0.75, minHeight: minimal ? 56 : 60, px: 1.5 }}>
        <HeaderBrand logoUrl={branding?.mweb_logo_url || branding?.logo_url} appName={branding?.app_name} />
        <HeaderMascotButton branding={branding} />
        {!minimal && effectiveStudio !== 'USER' && (
          <Chip
            label={STUDIO_LABEL[effectiveStudio]}
            color="primary"
            size="small"
            onClick={() => setStudioSwitchOpen(true)}
            sx={{ fontWeight: 900, borderRadius: 999 }}
          />
        )}

        <Box sx={{ flexGrow: 1 }} />

        {minimal ? (
          <SurveyHeaderActions onLogout={logout} />
        ) : (
          <>
            {/* Studio modes (Host/Venue/ecomm) get a focused header — no location, no search. */}
            {effectiveStudio === 'USER' && (
              <>
                <HeaderLocationButton
                  loading={loading}
                  hasData={!!data}
                  selectedLocationName={selectedLocation?.location_name}
                  selectedZoneName={selectedZoneName}
                  selectedCountryCode={selectedLocation?.country_code}
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
                  activeLocationIds={data?.activePodLocationIds ?? []}
                  draftLocationId={draftLocationId}
                  setDraftLocationId={setDraftLocationId}
                  draftZone={draftZone}
                  setDraftZone={setDraftZone}
                  onApply={() => {
                    onLocationChange(draftLocationId);
                    onZoneChange(draftZone);
                    setLocDialogOpen(false);
                  }}
                  onAutoApply={(locationId, zoneName) => {
                    setDraftLocationId(locationId);
                    setDraftZone(zoneName);
                    onLocationChange(locationId);
                    onZoneChange(zoneName);
                    setLocDialogOpen(false);
                  }}
                />

                <HeaderSearchButton locationId={selectedLocationId} zoneName={selectedZoneName} />
              </>
            )}
            <HeaderNotificationsBell onToast={handleNotifToast} />

            <Tooltip title={me?.full_name ?? 'Account'}>
              <IconButton
                onClick={(e) => setProfileAnchor(e.currentTarget)}
                sx={{ p: 0.25, minWidth: 44, minHeight: 44 }}
                aria-label="Open account menu"
              >
                <Avatar
                  src={me?.profile_photo || undefined}
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: 'primary.main',
                    fontSize: 13,
                    border: 2,
                    borderColor: 'primary.main',
                    boxShadow: '0 0 0 3px rgba(255,79,115,0.24)',
                  }}
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
            <StudioSwitchDialog
              open={studioSwitchOpen}
              roles={me?.roles ?? []}
              current={effectiveStudio}
              onClose={() => setStudioSwitchOpen(false)}
              onSelect={(next) => {
                setStudioMode(next);
                setStudioSwitchOpen(false);
                // Jump straight to the selected role's dashboard (B3-2).
                navigate(STUDIO_HOME_PATH[next]);
              }}
            />
          </>
        )}
      </Toolbar>

      {!minimal && me?.email && me.is_email_verified === false && (
        <Alert
          severity="info"
          onClick={() => navigate('/profile?verifyEmail=1')}
          sx={{ width: '100%', maxWidth: APP_SHELL_MAX_WIDTH, mx: 'auto', borderRadius: 0, cursor: 'pointer', py: 0.25 }}
        >
          Please verify your email
        </Alert>
      )}

      {!minimal && (
        <SuperCategoryTabs
          loading={loading}
          superCats={superCats}
          value={superCategoryValue}
          onChange={onSuperCategoryChange}
        />
      )}

      {!minimal && <HeaderToast toast={toast} onClose={() => setToast(null)} />}
    </AppBar>
  );
}
