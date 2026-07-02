import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
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

export const RAIL_WIDTH = 250;

export interface VenueSectionDef {
  key: VenueSectionKey;
  label: string;
  hint: string;
}

export const VENUE_SECTIONS: VenueSectionDef[] = [
  { key: 'details', label: 'Venue Details', hint: 'Name, images, category & location' },
  { key: 'type-capacity', label: 'Type & Capacity', hint: 'Venue type + capacity list' },
  { key: 'amenities', label: 'Amenities & Security', hint: 'Facilities, amenities & safety' },
  { key: 'documents', label: 'Venue Documents', hint: 'Uploads with document type' },
  { key: 'owner', label: 'Owner Details', hint: 'Contact for slot requests' },
  { key: 'leaves', label: 'Leaves & Holidays', hint: 'Closed dates — never bookable' },
  { key: 'review', label: 'Review & Submit', hint: 'Check everything and submit' },
];

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

/** Sections shown for the mode: an approved venue has nothing to submit, so
 * Review & Submit disappears; everything else stays navigable. */
export const sectionsForMode = (mode: RegisterVenueMode): VenueSectionDef[] =>
  mode === 'edit-approved' ? VENUE_SECTIONS.filter((section) => section.key !== 'review') : VENUE_SECTIONS;

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
      <Tabs
        value={active}
        onChange={(_event, next) => onSelect(next)}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Registration sections"
        sx={{ display: { xs: 'flex', md: 'none' }, borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        {sections.map((section) => (
          <Tab key={section.key} value={section.key} label={section.label} sx={{ fontWeight: 800 }} />
        ))}
      </Tabs>
    </>
  );
}
