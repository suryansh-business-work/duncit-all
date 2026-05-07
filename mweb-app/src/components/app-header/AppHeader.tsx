import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import PetsIcon from '@mui/icons-material/Pets';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ParkIcon from '@mui/icons-material/Park';
import type { SvgIconComponent } from '@mui/icons-material';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { ensurePushSubscription, notificationPermission, isPushSupported } from '../../pwa';
import {
  HEADER_DATA,
  POD_SEARCH,
  MY_NOTIFS,
  MARK_READ,
  MARK_ALL,
  PUBLIC_POLICIES,
} from './queries';
import LocationDialog from './LocationDialog';
import NotificationsPopover from './NotificationsPopover';
import PodSearchPopover from './PodSearchPopover';
import ProfileDrawer from './ProfileDrawer';

interface AppHeaderProps {
  selectedSuperCategory: string;
  onSuperCategoryChange: (slug: string) => void;
  selectedLocationId: string;
  onLocationChange: (id: string) => void;
  selectedZoneName: string;
  onZoneChange: (zone: string) => void;
}

const isImageIcon = (value: string | null | undefined) => {
  const next = (value ?? '').trim();
  return /^data:image\//i.test(next) || /^https?:\/\//i.test(next) || next.startsWith('/');
};

const MUI_ICON_MAP: Record<string, SvgIconComponent> = {
  PeopleAlt: PeopleAltIcon,
  EmojiPeople: EmojiPeopleIcon,
  Person: PersonIcon,
  Group: GroupsIcon,
  Groups: GroupsIcon,
  Pets: PetsIcon,
  PetsOutlined: PetsOutlinedIcon,
  Favorite: FavoriteIcon,
  FitnessCenter: FitnessCenterIcon,
  SportsSoccer: SportsSoccerIcon,
  Restaurant: RestaurantIcon,
  Park: ParkIcon,
};

const resolveMuiIcon = (value: string) => {
  return MUI_ICON_MAP[value] ?? null;
};

function renderSuperCategoryMark(icon: string | null | undefined) {
  const next = (icon ?? '').trim();
  if (!next) return null;
  if (isImageIcon(next)) {
    return (
      <Box
        component="img"
        src={next}
        alt=""
        sx={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 0.75, flex: '0 0 auto' }}
      />
    );
  }
  const MuiIcon = resolveMuiIcon(next);
  if (MuiIcon) return <MuiIcon sx={{ fontSize: 18, flex: '0 0 auto' }} />;
  return next.length <= 2 ? (
    <Box component="span" sx={{ lineHeight: 1, flex: '0 0 auto' }}>
      {next}
    </Box>
  ) : null;
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
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
  const [searchAnchor, setSearchAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
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
    pollInterval: 60000,
  });
  const [markReadMut] = useMutation(MARK_READ);
  const [markAllMut] = useMutation(MARK_ALL);
  const myNotifs: any[] = notifData?.myNotifications ?? [];
  const unreadCount: number = notifData?.myUnreadNotificationCount ?? 0;

  const { data: policiesData } = useQuery(PUBLIC_POLICIES, { fetchPolicy: 'cache-first' });
  const publicPolicies = policiesData?.publicPolicies ?? [];

  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationPermission()
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);

  const enablePush = async () => {
    setPushBusy(true);
    try {
      const ok = await ensurePushSubscription();
      setPerm(notificationPermission());
      if (!ok) setToast({ title: 'Notifications', body: 'Permission was not granted.' });
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type === 'PUSH_RECEIVED') {
        setToast({ title: msg.payload?.title ?? 'Duncit', body: msg.payload?.body ?? '' });
        refetchNotifs().catch(() => undefined);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [refetchNotifs]);

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

  const { data: podsData, loading: podsLoading } = useQuery(POD_SEARCH, {
    variables: {
      filter: {
        search: search || undefined,
        location_id: selectedLocationId || undefined,
      },
    },
    skip: !searchAnchor,
    fetchPolicy: 'cache-and-network',
  });

  const logout = () => {
    setProfileAnchor(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ gap: 0.5, py: 1, minHeight: 64, px: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <Box
            component="img"
            src={branding?.logo_url || '/duncit-logo.svg'}
            alt={branding?.app_name ?? 'Duncit'}
            sx={{
              height: 36,
              width: 'auto',
              maxWidth: 168,
              objectFit: 'contain',
              display: 'block',
              top: '4px',
              left: '-15px',
              position: 'relative',
            }}
          />
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Search pods">
          <IconButton size="small" onClick={(e) => setSearchAnchor(e.currentTarget)}>
            <SearchIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <PodSearchPopover
          anchor={searchAnchor}
          onClose={() => setSearchAnchor(null)}
          search={search}
          setSearch={setSearch}
          loading={podsLoading}
          pods={podsData?.pods ?? []}
          onSelect={(id) => {
            setSearchAnchor(null);
            navigate(`/pods/${id}`);
          }}
        />

        <Button
          startIcon={<LocationOnIcon />}
          onClick={() => {
            setDraftLocationId(selectedLocationId);
            setDraftZone(selectedZoneName);
            setLocDialogOpen(true);
          }}
          sx={{ textTransform: 'none', color: 'text.primary' }}
          size="small"
        >
          {selectedLocation?.location_name ?? 'Select city'}
          {selectedZoneName ? (
            <Chip
              size="small"
              label={selectedZoneName}
              sx={{ ml: 1, height: 20, fontSize: 11 }}
              color="primary"
            />
          ) : null}
        </Button>
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
          <IconButton size="small" onClick={(e) => setNotifAnchor(e.currentTarget)}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
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
          <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} sx={{ p: 0.25 }}>
            <Avatar
              src={me?.profile_photo || undefined}
              sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 13 }}>
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

        {loading && !data && <CircularProgress size={18} sx={{ ml: 1 }} />}
      </Toolbar>

      {loading && superCats.length === 0 ? (
        <Box sx={{ px: 1.5, pb: 0.75 }}>
          <Skeleton variant="rounded" height={36} />
        </Box>
      ) : superCats.length > 0 ? (
        <Box
          sx={{
            px: 1.5,
            pb: 0.75,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <ToggleButtonGroup
            value={superCategoryValue}
            exclusive
            fullWidth
            size="small"
            onChange={(_event, next) => {
              if (next) onSuperCategoryChange(next);
            }}
            sx={{
              width: '100%',
              '& .MuiToggleButton-root': {
                minWidth: 0,
                flex: 1,
                minHeight: 36,
                px: 0.75,
                gap: 0.5,
                fontSize: 12,
                whiteSpace: 'nowrap',
              },
            }}
          >
            {superCats.map((c: any) => (
              <ToggleButton key={c.id} value={c.slug} aria-label={c.name}>
                {renderSuperCategoryMark(c.icon)}
                <Box
                  component="span"
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {c.name}
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      ) : null}
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
