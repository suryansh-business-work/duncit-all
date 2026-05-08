import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  IconButton,
  Stack,
  SwipeableDrawer,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { HEADER_DATA, MY_NOTIFS, MARK_READ, MARK_ALL, PUBLIC_POLICIES } from './queries';
import LocationDialog from './LocationDialog';
import NotificationsPopover from './NotificationsPopover';
import ProfileDrawer from './ProfileDrawer';
import HeaderLocationButton from './HeaderLocationButton';
import SuperCategoryTabs from './SuperCategoryTabs';
import { useHeaderPushNotifications } from './useHeaderPushNotifications';
import { useNotificationsSse } from './useNotificationsSse';

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
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [notifConfirm, setNotifConfirm] = useState<HTMLElement | null>(null);
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
  const [policiesOpen, setPoliciesOpen] = useState(false);

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

  const { data: notifData, refetch: refetchNotifs } = useQuery(MY_NOTIFS, {
    fetchPolicy: 'cache-and-network',
  });
  // Server-Sent Events keep the bell + count live without client polling.
  useNotificationsSse(() => {
    void refetchNotifs();
  });
  const [markReadMut] = useMutation(MARK_READ);
  const [markAllMut] = useMutation(MARK_ALL);
  const myNotifs: any[] = notifData?.myNotifications ?? [];
  const unreadCount: number = notifData?.myUnreadNotificationCount ?? 0;

  const { data: policiesData } = useQuery(PUBLIC_POLICIES, { fetchPolicy: 'cache-first' });
  const publicPolicies = policiesData?.publicPolicies ?? [];

  const { perm, pushBusy, toast, setToast, enablePush } = useHeaderPushNotifications(
    () => refetchNotifs() as Promise<unknown>
  );

  const onNotifClick = async (n: any) => {
    if (!n.read_at) {
      try {
        await markReadMut({ variables: { id: n.id } });
        await refetchNotifs();
      } catch {
        /* ignore */
      }
    }
    const link = n.notification?.link_url;
    setNotifAnchor(null);
    if (link) navigate(link);
  };

  const onMarkAll = async () => {
    try {
      await markAllMut();
      await refetchNotifs();
    } catch {
      /* ignore */
    }
  };

  const logout = () => {
    setProfileAnchor(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'background.paper' }}>
      <Toolbar sx={{ gap: 1, py: 1, minHeight: 64, px: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          aria-label="Go to home"
        >
          <Box
            component="img"
            src={branding?.logo_url || '/duncit-logo.svg'}
            alt={branding?.app_name ?? 'Duncit'}
            sx={{ height: 44, width: 'auto', maxWidth: 200, objectFit: 'contain', display: 'block' }}
          />
        </Stack>

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

        <Tooltip title="Notifications">
          <IconButton
            size="small"
            onClick={(e) => setNotifConfirm(e.currentTarget)}
            aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
        <SwipeableDrawer
          anchor="bottom"
          open={!!notifConfirm}
          onOpen={() => undefined}
          onClose={() => setNotifConfirm(null)}
          PaperProps={{
            sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 2 },
          }}
        >
          <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mb: 2 }} />
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <NotificationsActiveIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={700}>
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                  : 'View notifications'}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Open your inbox to see club updates, new pods and silent moments.
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button onClick={() => setNotifConfirm(null)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={() => {
                  const anchor = notifConfirm;
                  setNotifConfirm(null);
                  setNotifAnchor(anchor);
                }}
              >
                View notifications
              </Button>
            </Stack>
          </Stack>
        </SwipeableDrawer>
        <NotificationsPopover
          anchor={notifAnchor}
          onClose={() => setNotifAnchor(null)}
          notifs={myNotifs}
          unreadCount={unreadCount}
          perm={perm}
          pushBusy={pushBusy}
          onEnablePush={enablePush}
          onNotifClick={onNotifClick}
          onMarkAll={onMarkAll}
        />

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

      <SuperCategoryTabs
        loading={loading}
        superCats={superCats}
        value={superCategoryValue}
        onChange={onSuperCategoryChange}
      />

      <Snackbar
        open={!!toast}
        onClose={() => setToast(null)}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert
          onClose={() => setToast(null)}
          severity="info"
          variant="filled"
          icon={<NotificationsActiveIcon />}
          sx={{ width: '100%' }}
        >
          <Typography variant="subtitle2">{toast?.title}</Typography>
          <Typography variant="caption">{toast?.body}</Typography>
        </MuiAlert>
      </Snackbar>
    </AppBar>
  );
}
