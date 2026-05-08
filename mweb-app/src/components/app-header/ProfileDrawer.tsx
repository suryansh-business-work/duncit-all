import { useNavigate } from 'react-router-dom';
import { useRoleLabels } from '../../hooks/useRoleLabels';
import { useColorMode } from '../../ColorModeContext';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { Switch, FormControlLabel } from '@mui/material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import Collapse from '@mui/material/Collapse';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArticleIcon from '@mui/icons-material/Article';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';

interface Props {
  open: boolean;
  onClose: () => void;
  me: any;
  publicPolicies: { id: string; slug: string; title: string }[];
  policiesOpen: boolean;
  setPoliciesOpen: (fn: (v: boolean) => boolean) => void;
  onLogout: () => void;
}

type Item = { label: string; icon: JSX.Element; onClick: () => void };

export default function ProfileDrawer({
  open,
  onClose,
  me,
  publicPolicies,
  policiesOpen,
  setPoliciesOpen,
  onLogout,
}: Props) {
  const navigate = useNavigate();
  const { labelFor } = useRoleLabels();
  const { mode, toggle: toggleMode } = useColorMode();
  const roles: string[] = me?.roles ?? [];
  const isAdmin = roles.some((r) => ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'].includes(r));
  const isHost = roles.includes('HOST');
  const isVenue = roles.includes('VENUE_OWNER');

  const go = (to: string) => () => {
    onClose();
    navigate(to);
  };

  const baseItems: Item[] = [
    { label: 'Home', icon: <HomeIcon fontSize="small" />, onClick: go('/') },
    { label: 'Profile', icon: <PersonOutlineIcon fontSize="small" />, onClick: go('/profile') },
    { label: 'Saved Items', icon: <BookmarkBorderIcon fontSize="small" />, onClick: go('/saved') },
  ];
  const hostItem: Item = isHost
    ? { label: 'Hosts Management', icon: <DashboardIcon fontSize="small" />, onClick: go('/host/manage') }
    : { label: 'Be a host', icon: <StorefrontIcon fontSize="small" />, onClick: go('/become-host') };
  const venueItem: Item = isVenue
    ? { label: 'Venue Management', icon: <StorefrontIcon fontSize="small" />, onClick: go('/venues/manage') }
    : {
        label: 'Be a Venue Owner',
        icon: <AddBusinessIcon fontSize="small" />,
        onClick: go('/register-venue'),
      };
  const supportItems: Item[] = [
    { label: 'Support', icon: <SupportAgentIcon fontSize="small" />, onClick: go('/support') },
    { label: 'Pod Ideas', icon: <LightbulbIcon fontSize="small" />, onClick: go('/pod-ideas') },
    { label: 'FAQs', icon: <HelpOutlineIcon fontSize="small" />, onClick: go('/faqs') },
  ];
  const adminItems: Item[] = isAdmin
    ? [
        {
          label: 'Admin Console',
          icon: <AdminPanelSettingsIcon fontSize="small" />,
          onClick: () => window.open('/admin', '_blank'),
        },
      ]
    : [];

  const renderItem = (it: Item) => (
    <ListItem key={it.label} disablePadding>
      <ListItemButton onClick={it.onClick} sx={{ px: 2.5, py: 1.25 }}>
        <ListItemIcon sx={{ minWidth: 36 }}>{it.icon}</ListItemIcon>
        <ListItemText
          primary={it.label}
          primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
        />
      </ListItemButton>
    </ListItem>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: 300, sm: 340 } } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            Account
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ px: 2.5, pb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              src={me?.profile_photo || undefined}
              sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 20 }}
            >
              {(me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {me?.full_name ?? 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {me?.email ?? '—'}
              </Typography>
              {roles.length > 0 && (
                <Stack
                  direction="row"
                  useFlexGap
                  sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.75 }}
                >
                  {roles.map((r) => (
                    <Chip
                      key={r}
                      size="small"
                      label={labelFor(r)}
                      color={
                        ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'].includes(r)
                          ? 'primary'
                          : r === 'HOST' || r === 'VENUE_OWNER'
                            ? 'secondary'
                            : 'default'
                      }
                      variant={r === 'USER' ? 'outlined' : 'filled'}
                      sx={{ height: 22, fontSize: 11 }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <List sx={{ py: 1 }}>
            {baseItems.map(renderItem)}
            {renderItem(hostItem)}
            {renderItem(venueItem)}
          </List>
          <Divider />
          <List sx={{ py: 1 }}>{supportItems.map(renderItem)}</List>
          {publicPolicies.length > 0 && (
            <>
              <Divider />
              <List sx={{ py: 1 }}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => setPoliciesOpen((v) => !v)}
                    sx={{ px: 2.5, py: 1.25 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <DescriptionIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Policies"
                      primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                    />
                    {policiesOpen ? (
                      <ExpandLessIcon fontSize="small" />
                    ) : (
                      <ExpandMoreIcon fontSize="small" />
                    )}
                  </ListItemButton>
                </ListItem>
                <Collapse in={policiesOpen} timeout="auto" unmountOnExit>
                  <List disablePadding>
                    {publicPolicies.map((p) => (
                      <ListItem key={p.id} disablePadding>
                        <ListItemButton
                          onClick={() => {
                            onClose();
                            navigate(`/policies/${p.slug}`);
                          }}
                          sx={{ pl: 6, pr: 2.5, py: 1 }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <ArticleIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={p.title}
                            primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </List>
            </>
          )}
          {adminItems.length > 0 && (
            <>
              <Divider />
              <Box sx={{ px: 2.5, pt: 1.5 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 600, letterSpacing: 0.6 }}
                >
                  Admin
                </Typography>
              </Box>
              <List sx={{ pt: 0.5, pb: 1 }}>{adminItems.map(renderItem)}</List>
            </>
          )}
        </Box>
        <Divider />
        <Box sx={{ p: 1.5 }}>
          <FormControlLabel
            sx={{
              mx: 0,
              width: '100%',
              justifyContent: 'space-between',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              px: 1.25,
              py: 0.25,
              mb: 1.25,
            }}
            labelPlacement="start"
            control={
              <Switch
                size="small"
                checked={mode === 'dark'}
                onChange={toggleMode}
                color="primary"
                inputProps={{ 'aria-label': 'Toggle dark mode' }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DarkModeIcon fontSize="small" />
                <Typography variant="body2" fontWeight={600}>
                  Dark mode
                </Typography>
              </Box>
            }
          />
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={onLogout}
          >
            Logout
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
