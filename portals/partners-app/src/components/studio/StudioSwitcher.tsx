import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  ButtonBase,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlined';
import LocalMallOutlinedIcon from '@mui/icons-material/LocalMallOutlined';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import { useTranslation } from '@duncit/shell';
import {
  PARTNER_SECTIONS,
  visibleSections,
  type PartnerRole,
  type PartnerSection,
} from '../../config/partner-sections';
import { useStudioCopy } from './studioCopy';

const STUDIO_ICON: Record<PartnerRole, SvgIconComponent> = {
  CLUB_ADMIN: GroupsOutlinedIcon,
  VENUE_OWNER: StorefrontOutlinedIcon,
  HOST: WorkOutlineIcon,
  ECOMM_MANAGER: LocalMallOutlinedIcon,
};

interface Props {
  roles: readonly string[] | null | undefined;
  products: boolean;
  active: PartnerRole | null;
}

/** First page of a studio — its Home. */
const homeOf = (section: PartnerSection) => section.nav.children?.[0]?.to ?? '/';

/**
 * The control at the top of the sidebar that picks which ONE studio the menu
 * shows. It lists the studios the partner holds, then the ways into the ones
 * they could still apply for. Somebody who holds none sees no switcher — their
 * sidebar already lists those ways in.
 */
export default function StudioSwitcher({ roles, products, active }: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = useStudioCopy();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const held = visibleSections(roles, products);
  const current = held.find((section) => section.role === active) ?? held[0];
  if (!current) return null;
  const joinable = PARTNER_SECTIONS.filter(
    (section) =>
      section.onboarding && !held.includes(section) && (products || !section.products),
  );
  const CurrentIcon = STUDIO_ICON[current.role];
  const go = (to: string) => {
    setAnchor(null);
    navigate(to);
  };

  return (
    <>
      <ButtonBase
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-label={t('shell.nav.switchStudio')}
        data-testid="studio-switcher"
        sx={{
          width: '100%',
          justifyContent: 'flex-start',
          gap: 1.25,
          px: 1.5,
          py: 1,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          textAlign: 'left',
        }}
      >
        <CurrentIcon color="primary" fontSize="small" />
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
            {t('shell.nav.studio')}
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
            {copy[current.role].name}
          </Typography>
        </Stack>
        <UnfoldMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 260 } } }}
      >
        {held.map((section) => {
          const Icon = STUDIO_ICON[section.role];
          return (
            <MenuItem
              key={section.role}
              selected={section === current}
              onClick={() => go(homeOf(section))}
              data-testid={`studio-option-${section.role}`}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={copy[section.role].name}
                secondary={copy[section.role].caption}
              />
            </MenuItem>
          );
        })}
        {joinable.length > 0 && <Divider />}
        {joinable.map((section) => (
          <MenuItem
            key={section.role}
            onClick={() => go(section.onboarding?.to ?? '/earn')}
            data-testid={`studio-join-${section.role}`}
          >
            <ListItemIcon>
              <VolunteerActivismOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={copy[section.role].join} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
