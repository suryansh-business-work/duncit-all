import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { DuncitTabs } from '@duncit/tabs';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CategoryIcon from '@mui/icons-material/Category';
import ChecklistIcon from '@mui/icons-material/Checklist';
import DescriptionIcon from '@mui/icons-material/Description';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import type { SectionState } from '../register-venue/useRegisterVenueForm';
import type { RegisterVenueMode, VenueSectionKey } from '../register-venue';
import { sectionsForMode } from './venue-sections';

export const RAIL_WIDTH = 250;

const SECTION_ICONS: Record<VenueSectionKey, JSX.Element> = {
  details: <StorefrontIcon fontSize="small" />,
  'type-capacity': <CategoryIcon fontSize="small" />,
  amenities: <ChecklistIcon fontSize="small" />,
  documents: <DescriptionIcon fontSize="small" />,
  owner: <PersonIcon fontSize="small" />,
  leaves: <EventBusyIcon fontSize="small" />,
  review: <SendIcon fontSize="small" />,
};

interface Props {
  active: VenueSectionKey;
  sectionState: Record<Exclude<VenueSectionKey, 'review' | 'leaves'>, SectionState>;
  onSelect: (key: VenueSectionKey) => void;
  mode: RegisterVenueMode;
}

const stateIcon = (key: VenueSectionKey, sectionState: Props['sectionState']) => {
  if (key === 'review' || key === 'leaves') return null;
  if (sectionState[key] === 'complete') {
    return <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />;
  }
  return <RadioButtonUncheckedIcon color="disabled" sx={{ fontSize: 18 }} />;
};

/** 250px side drawer listing the registration sections (md+); collapses to
 * scrollable tabs on small screens. */
export default function SectionRail({ active, sectionState, onSelect, mode }: Readonly<Props>) {
  const sections = sectionsForMode(mode);
  return (
    <>
      <Box
        component="nav"
        aria-label="Registration sections"
        sx={{
          width: RAIL_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          borderRight: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 96,
          alignSelf: 'flex-start',
        }}
      >
        <Typography variant="overline" sx={{ px: 2, fontWeight: 900, color: 'text.secondary' }}>
          Registration sections
        </Typography>
        <List dense sx={{ pr: 1.5 }}>
          {sections.map((section) => (
            <ListItemButton
              key={section.key}
              selected={active === section.key}
              onClick={() => onSelect(section.key)}
              aria-current={active === section.key ? 'true' : undefined}
              sx={{ borderRadius: 1.5, mb: 0.5, alignItems: 'flex-start' }}
            >
              <ListItemIcon sx={{ minWidth: 34, mt: 0.4 }}>{SECTION_ICONS[section.key]}</ListItemIcon>
              <ListItemText
                primary={section.label}
                secondary={section.hint}
                primaryTypographyProps={{ fontWeight: 800, fontSize: 14 }}
                secondaryTypographyProps={{ fontSize: 11.5 }}
              />
              <Box sx={{ mt: 0.6 }}>{stateIcon(section.key, sectionState)}</Box>
            </ListItemButton>
          ))}
        </List>
      </Box>
      <DuncitTabs
        items={sections.map((section) => ({
          value: section.key,
          label: section.label,
          sx: { fontWeight: 800 },
        }))}
        value={active}
        onChange={onSelect}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Registration sections"
        sx={{ display: { xs: 'flex', md: 'none' }, borderBottom: 1, borderColor: 'divider', mb: 2 }}
      />
    </>
  );
}
