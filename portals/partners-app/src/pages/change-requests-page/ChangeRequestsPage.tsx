import { Card, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { ChangeRequestBoard } from '@duncit/pod-change-requests';
import { notifySuccess } from '@duncit/dialogs';
import type { PodChangeRole } from '@duncit/utils';

/**
 * The section's overline, as a LITERAL key per role.
 *
 * Written out rather than composed from the role, because
 * `scripts/verify-translation-keys.mjs` greps source for the literal string a
 * `t()` is handed — a built key is invisible to it and its bundle rows are then
 * reported as shipped-but-never-rendered.
 */
const OVERLINE_KEY: Record<PodChangeRole, string> = {
  VENUE: 'partners.common.partnerToolsVenues',
  HOST: 'partners.common.partnerToolsHost',
  CLUB_ADMIN: 'partners.common.partnerToolsClubAdmin',
};

/**
 * Change Requests, in the Partners console.
 *
 * ONE page component behind three routes (Venue Owner, Host, Club Admin) — the
 * shape `useAutoPodsQueue` settled on for the same reason: the three differ
 * only in whose queue they scope to, and three near-identical pages is how they
 * would come to word the same decision differently.
 */
export default function ChangeRequestsPage({ role }: Readonly<{ role: PodChangeRole }>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          {t(OVERLINE_KEY[role])}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 950 }}>
          {t('changeRequest.sectionTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('changeRequest.sectionSubtitle')}
        </Typography>
      </Card>
      <ChangeRequestBoard role={role} hideHeader onChanged={notifySuccess} />
    </Stack>
  );
}
