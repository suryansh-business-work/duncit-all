import type { JSX } from 'react';
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
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SendIcon from '@mui/icons-material/Send';
import type { SectionState } from '../register-venue/useRegisterVenueForm';
import type { RegisterVenueMode, VenueSectionKey } from '../register-venue';
import { sectionsForMode, type VenueSectionDef } from './venue-sections';
import { useTranslation } from '@duncit/shell';

export const RAIL_WIDTH = 250;

const SECTION_ICONS: Record<VenueSectionKey, JSX.Element> = {
  details: <StorefrontIcon fontSize="small" />,
  'type-capacity': <CategoryIcon fontSize="small" />,
  amenities: <ChecklistIcon fontSize="small" />,
  documents: <DescriptionIcon fontSize="small" />,
  owner: <PersonIcon fontSize="small" />,
  payout: <AccountBalanceIcon fontSize="small" />,
  leaves: <EventBusyIcon fontSize="small" />,
  review: <SendIcon fontSize="small" />,
};

interface Props {
  active: VenueSectionKey;
  sectionState: Record<Exclude<VenueSectionKey, 'review' | 'leaves'>, SectionState>;
  onSelect: (key: VenueSectionKey) => void;
  mode: RegisterVenueMode;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const sectionLabel = (section: VenueSectionDef, t: Translate) =>
  section.labelKey ? t(section.labelKey) : section.label;
const sectionHint = (section: VenueSectionDef, t: Translate) =>
  section.hintKey ? t(section.hintKey) : section.hint;

/** The tick is the only sign a section is done, so it is named (1.1.1 / 1.4.1). */
const stateIcon = (key: VenueSectionKey, sectionState: Props['sectionState'], t: Translate) => {
  if (key === 'review' || key === 'leaves') return null;
  if (sectionState[key] === 'complete') {
    return <CheckCircleIcon color="success" titleAccess={t('partners.a11y.sectionComplete')} sx={{ fontSize: 18 }} />;
  }
  return <RadioButtonUncheckedIcon color="action" titleAccess={t('partners.a11y.sectionIncomplete')} sx={{ fontSize: 18 }} />;
};

/** 250px side drawer listing the registration sections (md+); collapses to
 * scrollable tabs on small screens. */
export default function SectionRail({ active, sectionState, onSelect, mode }: Readonly<Props>) {
  const { t } = useTranslation();
  const sections = sectionsForMode(mode);
  return (
    <>
      <Box
        component="nav"
        aria-label={t('partners.registerVenuePage.registrationSections')}
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
          {t('partners.registerVenuePage.registrationSections')}
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
                primary={sectionLabel(section, t)}
                secondary={sectionHint(section, t)}
                slotProps={{
                  primary: { sx: { fontWeight: 800, fontSize: 14 } },
                  secondary: { sx: { fontSize: 11.5 } }
                }} />
              <Box sx={{ mt: 0.6 }}>{stateIcon(section.key, sectionState, t)}</Box>
            </ListItemButton>
          ))}
        </List>
      </Box>
      <DuncitTabs
        items={sections.map((section) => ({
          value: section.key,
          label: sectionLabel(section, t),
          sx: { fontWeight: 800 },
        }))}
        value={active}
        onChange={onSelect}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label={t('partners.registerVenuePage.registrationSections')}
        sx={{ display: { xs: 'flex', md: 'none' }, borderBottom: 1, borderColor: 'divider', mb: 2 }}
      />
    </>
  );
}
