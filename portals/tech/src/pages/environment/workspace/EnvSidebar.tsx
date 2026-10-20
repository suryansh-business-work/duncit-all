import { Box, IconButton, InputAdornment, List, Stack, TextField, Tooltip, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HubIcon from '@mui/icons-material/Hub';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from '@duncit/app-settings';
import EnvSidebarGroup, { EnvSidebarLink, type SidebarLink } from './EnvSidebarGroup';
import { CONFIG_GROUP, MAPPING, OVERVIEW, SETTINGS, type SectionGroup, type useEnvSections } from './useEnvSections';

/** The width the sidebar keeps from `md` up; below that it stacks above the content. */
export const ENV_SIDEBAR_WIDTH = 250;

type Sections = ReturnType<typeof useEnvSections>;
type Translate = ReturnType<typeof useTranslation>['t'];

const categoryLinks = (group: SectionGroup, t: Translate): SidebarLink[] =>
  group.items.map((item) => ({
    value: item.value,
    label: item.label,
    subtitle: t('tech.environment.categoryCounts', {
      vars: { total: item.counts?.total ?? 0, tested: item.counts?.tested ?? 0 },
    }),
    failing: item.counts?.failing ?? 0,
    healthy: !!item.counts?.total && item.counts.passing === item.counts.total,
  }));

/** Search, fold/unfold, then every section: overview, the grouped categories and configuration. */
export default function EnvSidebar({ sections }: Readonly<{ sections: Sections }>) {
  const { t } = useTranslation();
  const { groups, selected, select, query, setQuery, isOpen, toggle } = sections;

  const overview: SidebarLink = {
    value: OVERVIEW,
    label: t('tech.environment.overview'),
    subtitle: t('tech.environment.overviewSubtitle'),
    icon: <DashboardIcon fontSize="small" color="primary" />,
  };
  const config: SidebarLink[] = [
    { value: MAPPING, label: t('tech.environment.portalMapping'), subtitle: t('tech.environment.portalMappingSubtitle'), icon: <HubIcon fontSize="small" /> },
    { value: SETTINGS, label: t('shell.nav.settings'), subtitle: t('tech.environment.settingsSubtitle'), icon: <TuneIcon fontSize="small" /> },
  ];

  return (
    <Box
      component="nav"
      aria-label={t('tech.environment.sidebarLabel')}
      sx={{
        width: { xs: '100%', md: ENV_SIDEBAR_WIDTH },
        flexShrink: 0,
        alignSelf: 'flex-start',
        position: { md: 'sticky' },
        top: (theme) => theme.spacing(2),
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: { md: '80vh' },
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ p: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          fullWidth
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('tech.environment.searchKeys')}
          slotProps={{
            htmlInput: { 'aria-label': t('tech.environment.searchKeys'), 'data-testid': 'env-sidebar-search' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" aria-label={t('shell.common.clear')} onClick={() => setQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <Tooltip title={t('tech.environment.expandAll')}>
          <IconButton size="small" aria-label={t('tech.environment.expandAll')} onClick={sections.expandAll}>
            <UnfoldMoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('tech.environment.collapseAll')}>
          <IconButton size="small" aria-label={t('tech.environment.collapseAll')} onClick={sections.collapseAll}>
            <UnfoldLessIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <List dense disablePadding sx={{ overflowY: 'auto', pb: 1 }}>
        <li>
          <EnvSidebarLink link={overview} selected={selected === OVERVIEW} onSelect={select} />
        </li>
        {groups.map((group) => (
          <EnvSidebarGroup
            key={group.key}
            id={group.key}
            title={group.label}
            subtitle={t('tech.environment.groupCounts', { vars: { services: group.items.length, total: group.total } })}
            open={isOpen(group.key)}
            links={categoryLinks(group, t)}
            selected={selected}
            onToggle={() => toggle(group.key)}
            onSelect={select}
          />
        ))}
        {query.trim() && groups.length === 0 ? (
          <Typography variant="body2" role="status" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
            {t('tech.environment.noSectionsMatch', { vars: { query: query.trim() } })}
          </Typography>
        ) : null}
        <EnvSidebarGroup
          id={CONFIG_GROUP}
          title={t('tech.environment.configuration')}
          subtitle={t('tech.environment.configurationSubtitle')}
          open={isOpen(CONFIG_GROUP)}
          links={config}
          selected={selected}
          onToggle={() => toggle(CONFIG_GROUP)}
          onSelect={select}
        />
      </List>
    </Box>
  );
}
