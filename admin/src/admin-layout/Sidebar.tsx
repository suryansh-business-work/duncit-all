import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Divider,
  FormControlLabel,
  InputAdornment,
  List,
  ListItemIcon,
  ListItemText,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AppsIcon from '@mui/icons-material/Apps';
import SearchIcon from '@mui/icons-material/Search';
import { useColorMode } from '../ColorModeContext';
import { useBranding } from '../lib/useBranding';
import { Brand, NavItem } from './styled';
import { useNavState } from './useNavState';
import NavItemView from './NavItemView';

interface Props {
  onCloseMobile: () => void;
}

export default function Sidebar({ onCloseMobile }: Props) {
  const navigate = useNavigate();
  const { mode, toggle } = useColorMode();
  const { logoUrl, appName } = useBranding();
  const {
    location,
    navSearch,
    setNavSearch,
    navQuery,
    isPathActive,
    isGroupActive,
    openGroups,
    toggleGroup,
    visibleNav,
    showModulesItem,
  } = useNavState();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Brand
        sx={{ cursor: 'pointer' }}
        onClick={() => {
          onCloseMobile();
          navigate('/hub');
        }}
      >
        <Box
          component="img"
          src={logoUrl}
          alt={appName}
          sx={{ height: 28, width: 'auto', maxWidth: 130, objectFit: 'contain' }}
        />
        <Box>
          <Typography variant="caption" color="text.secondary">
            Admin Console
          </Typography>
        </Box>
      </Brand>
      <Divider />
      <Box sx={{ p: 1.25 }}>
        <TextField
          value={navSearch}
          onChange={(event) => setNavSearch(event.target.value)}
          placeholder="Search menu"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <Divider />
      <List sx={{ py: 1, flex: 1, overflowY: 'auto' }}>
        {showModulesItem && (
          <NavItem
            component={RouterLink}
            to="/hub"
            active={location.pathname === '/hub'}
            onClick={onCloseMobile}
          >
            <ListItemIcon>
              <AppsIcon />
            </ListItemIcon>
            <ListItemText
              primary="Modules"
              primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
            />
          </NavItem>
        )}
        {visibleNav.map((section, idx) => (
          <Box key={section.heading ?? `s-${idx}`} sx={{ mb: 1 }}>
            {section.heading && (
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ px: 2.5, fontWeight: 600, letterSpacing: 0.6, display: 'block', mt: 1 }}
              >
                {section.heading}
              </Typography>
            )}
            {section.items.map((item) => (
              <NavItemView
                key={(item as any).to ?? (item as any).label}
                item={item}
                navQuery={navQuery}
                openGroups={openGroups}
                toggleGroup={toggleGroup}
                isPathActive={isPathActive}
                isGroupActive={isGroupActive}
                onCloseMobile={onCloseMobile}
              />
            ))}
          </Box>
        ))}
        {!showModulesItem && visibleNav.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
            No menu matches found.
          </Typography>
        )}
      </List>
      <Divider />
      <Box sx={{ p: 1.25 }}>
        <FormControlLabel
          sx={{
            mx: 0,
            width: '100%',
            justifyContent: 'space-between',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            px: 1.25,
            py: 0.25,
            mb: 1,
          }}
          labelPlacement="start"
          control={
            <Switch
              size="small"
              checked={mode === 'dark'}
              onChange={toggle}
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
        <Typography variant="caption" color="text.secondary">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );
}
