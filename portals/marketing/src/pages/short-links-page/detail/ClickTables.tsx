import { useMemo, useState, type ReactNode } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { getClickColumns } from './clickColumns';
import { getJourneyColumns } from './journeyColumns';
import JourneyTimelineDialog from './JourneyTimelineDialog';
import {
  SHORT_LINK_CLICKS,
  SHORT_LINK_JOURNEYS,
  type ShortLinkClickRow,
  type ShortLinkJourneyRow,
} from '../queries';

const getRowId = (row: ShortLinkClickRow) => row.id;
const getJourneyRowId = (row: ShortLinkJourneyRow) => row.id;

interface Props {
  linkId: string;
  /** An external destination is somebody else's site, so nothing past the click. */
  external: boolean;
}

interface SectionProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

function TableSection({ title, subtitle, children }: Readonly<SectionProps>) {
  return (
    <Box>
      <Stack spacing={0.25} sx={{ mb: 1 }}>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

/**
 * The two per-click tables.
 *
 * The journey table is dropped for an external link, and that is not a
 * simplification: the funnel past the click is reported BY the landing page,
 * and we do not run the page an external link lands on. An empty funnel there
 * would read as "nobody converted" rather than "we cannot see".
 */
export default function ClickTables({ linkId, external }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();
  const [openJourney, setOpenJourney] = useState<ShortLinkJourneyRow | null>(null);

  const fetchClicks = useApolloTableFetch<ShortLinkClickRow>(
    client,
    SHORT_LINK_CLICKS,
    'shortLinkClicks',
    { extraVariables: { id: linkId } },
    [linkId],
  );
  const fetchJourneys = useApolloTableFetch<ShortLinkJourneyRow>(
    client,
    SHORT_LINK_JOURNEYS,
    'shortLinkJourneys',
    { extraVariables: { id: linkId } },
    [linkId],
  );

  const clickColumns = useMemo(() => getClickColumns(t), [t]);
  const journeyColumns = useMemo(() => getJourneyColumns(t), [t]);
  const nothingYet = t('marketing.shortLinks.noClicksYet');

  return (
    <Stack spacing={2}>
      {!external && (
        <TableSection
          title={t('marketing.shortLinks.whoFollowed')}
          subtitle={t('marketing.shortLinks.whoFollowedHint')}
        >
          <DuncitTable<ShortLinkJourneyRow>
            tableId="marketing-short-link-journeys"
            columns={journeyColumns}
            fetchRows={fetchJourneys}
            getRowId={getJourneyRowId}
            onRowClick={setOpenJourney}
            emptyText={nothingYet}
            searchPlaceholder={t('marketing.shortLinks.searchJourneys')}
            defaultSort={{ field: 'clicked_at', dir: 'desc' }}
          />
        </TableSection>
      )}

      <TableSection
        title={t('marketing.shortLinks.everyClick')}
        subtitle={t('marketing.shortLinks.everyClickHint')}
      >
        <DuncitTable<ShortLinkClickRow>
          tableId="marketing-short-link-clicks"
          columns={clickColumns}
          fetchRows={fetchClicks}
          getRowId={getRowId}
          emptyText={nothingYet}
          searchPlaceholder={t('marketing.shortLinks.searchClicks')}
          defaultSort={{ field: 'clicked_at', dir: 'desc' }}
        />
      </TableSection>

      <JourneyTimelineDialog
        journey={openJourney}
        formatDateTime={formatDateTime}
        onClose={() => setOpenJourney(null)}
      />
    </Stack>
  );
}
