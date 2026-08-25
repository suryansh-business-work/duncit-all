import type { ReactNode } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { AppIcon } from '../chrome/AppIcon';
import { useTranslation } from '../i18n/useTranslation';
import type { AppModule } from '../types';
import { AccountSummaryCard } from './AccountSummaryCard';

const DASHBOARD_ME = gql`
  query DashboardMe {
    me {
      user_id
      full_name
      first_name
      last_name
      email
      phone_number
      phone_extension
      roles
      created_at
    }
  }
`;

/** One "coming soon" module tile. Each is its own widget, so a console can be
 *  rearranged around the module its team actually waits on. */
interface ModuleCardProps {
  icon: string;
  title: string;
  description: string;
  comingSoon: string;
}

function ModuleCard({ icon, title, description, comingSoon }: Readonly<ModuleCardProps>) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1}>
          <Box sx={{ color: 'primary.main' }}>
            <AppIcon name={icon} />
          </Box>
          <Typography variant="subtitle2" sx={{
            fontWeight: 700
          }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {description}
          </Typography>
          <Chip label={comingSoon} size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
        </Stack>
      </CardContent>
    </Card>
  );
}

export type WelcomeDashboardProps = Readonly<{
  /**
   * Stable key this portal's saved layouts are stored under — e.g. `hr.overview`.
   * Every console using this dashboard needs its own, or two portals would
   * share (and overwrite) one arrangement.
   */
  dashboardId: string;
  /** Portal short name (`appConfig.name`) — heads the modules section ("HR modules"). */
  name: string;
  /** Sub-header line under the greeting (`appConfig.tagline`). */
  tagline: string;
  /**
   * "Coming soon" module cards (`appConfig.modules`). When provided (even `[]`)
   * each becomes a widget after the account card — the hr/employee/ads-portal
   * layout.
   */
  modules?: readonly AppModule[];
  /**
   * Custom body rendered as the first widget, which pushes the account card
   * below it — the finance layout (its KPI "overview" section goes here).
   */
  children?: ReactNode;
}>;

/**
 * The `me`-query welcome dashboard (greeting + role chips + account card)
 * previously duplicated as `pages/DashboardPage.tsx` across five portals.
 *
 * It renders through the shared grid, so the greeting stays a fixed header
 * while the body, the account card and every module tile are widgets the
 * reader can arrange and keep.
 */
export function WelcomeDashboard({
  dashboardId,
  name,
  tagline,
  modules,
  children,
}: WelcomeDashboardProps) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(DASHBOARD_ME, { fetchPolicy: 'cache-and-network' });
  const me = data?.me;

  if (loading && !me) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{parseApiError(error)}</Alert>;
  }

  const firstName = me?.first_name || me?.full_name?.split(' ')[0] || 'there';
  const widgets: DashboardWidget[] = [];
  let row = 0;

  if (children) {
    widgets.push({
      id: 'portal-body',
      bare: true,
      // The body is whatever the portal passes — finance's KPI row wraps with
      // the viewport, ads stacks KPIs above a table. No fixed row count fits
      // them all, and an undersized one nests a scrollbar inside the page's.
      fitContent: true,
      defaultLayout: { x: 0, y: row, w: 12, h: 4 },
      minH: 2,
      content: children,
    });
    row += 4;
  }

  widgets.push({
    id: 'account-summary',
    bare: true,
    // The card does not stretch, so an oversized slot shows as a void below it.
    fitContent: true,
    defaultLayout: { x: 0, y: row, w: 12, h: 2 },
    minW: 4,
    minH: 2,
    content: <AccountSummaryCard user={me} />,
  });
  row += 2;

  if (modules?.length) {
    widgets.push({
      id: 'modules-heading',
      bare: true,
      defaultLayout: { x: 0, y: row, w: 12, h: 1 },
      minH: 1,
      content: (
        <Typography variant="subtitle1" sx={{
          fontWeight: 700
        }}>
          {t('shell.welcome.modulesHeading', { vars: { name } })}
        </Typography>
      ),
    });
    row += 1;

    for (const [index, module] of modules.entries()) {
      widgets.push({
        id: `module-${module.title}`,
        bare: true,
        defaultLayout: { x: (index % 4) * 3, y: row + Math.floor(index / 4) * 3, w: 3, h: 3 },
        minW: 2,
        minH: 2,
        content: (
          <ModuleCard
            icon={module.icon}
            title={module.titleKey ? t(module.titleKey) : module.title}
            description={module.descriptionKey ? t(module.descriptionKey) : module.description}
            comingSoon={t('shell.welcome.comingSoon')}
          />
        ),
      });
    }
  }

  return (
    <DuncitDashboard
      dashboardId={dashboardId}
      header={
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>
            {t('shell.welcome.greeting', { vars: { name: firstName } })}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {tagline}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
            {(me?.roles ?? []).map((role: string) => (
              <Chip key={role} label={role.replaceAll('_', ' ')} color="primary" variant="outlined" size="small" />
            ))}
          </Stack>
        </Box>
      }
      widgets={widgets}
    />
  );
}
