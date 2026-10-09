import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import { Card, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack } from '@mui/material';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { useFeatureFlag } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { useUserData } from '@duncit/user-context';
import { STUDIO_OPTIONS_ENTRY, studioOptionsFor, type PartnerStudioMode } from '@duncit/utils';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import { STUDIO_OPTION_ICONS } from './optionIcons';
import VenueOptionsPicker from './VenueOptionsPicker';

interface Props {
  mode: PartnerStudioMode;
}

/**
 * A studio's Options page — the page its ONE sidebar entry opens. Every option
 * the shared catalogue (@duncit/utils studio-options) lists for the studio, as
 * a list row: icon, title, a one-line hint and a chevron. mWeb and the native
 * app list the very same options, so the three surfaces cannot disagree.
 */
export default function StudioOptionsPage({ mode }: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useUserData();
  const autoPods = useFeatureFlag('auto_pods');
  const entry = STUDIO_OPTIONS_ENTRY[mode];
  const roles = user?.roles;
  const options = useMemo(() => studioOptionsFor(mode, roles ?? [], { autoPods }), [mode, roles, autoPods]);
  const title = t(entry.labelKey);

  return (
    <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 760 }} data-testid={`studio-options-${mode}`}>
      <StudioPageHeader title={title} hint={t(entry.hintKey)} />

      {mode === 'VENUE' && <VenueOptionsPicker />}

      <Card variant="outlined">
        <List disablePadding aria-label={title}>
          {options.map((option, index) => {
            const Icon = STUDIO_OPTION_ICONS[option.icon];
            return (
              <ListItem key={option.key} disablePadding divider={index < options.length - 1}>
                <ListItemButton
                  component={RouterLink}
                  to={option.portal}
                  data-testid={`studio-option-item-${option.key}`}
                >
                  <ListItemIcon>
                    <Icon color="primary" aria-hidden />
                  </ListItemIcon>
                  <ListItemText primary={t(option.labelKey)} secondary={t(option.hintKey)} />
                  <ChevronRight aria-hidden sx={{ color: 'text.secondary' }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Card>
    </Stack>
  );
}
