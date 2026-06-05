import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import {
  CRM_WEBSITE_PAGES,
  DELETE_CRM_WEBSITE_PAGE,
  SCRAPE_CRM_WEBSITE_PAGES,
  type CrmEntityType,
  type CrmWebsitePage,
} from '../../api/websitePages.gql';
import { parseApiError } from '../../utils/parseApiError';
import ConfirmDialog from '../ConfirmDialog';
import ExternalLink from '../ExternalLink';
import ScrapeDialog from './ScrapeDialog';
import WebsitePagesTable from './WebsitePagesTable';
import PageContentDialog from './PageContentDialog';

interface Props {
  entity: CrmEntityType;
  leadId: string;
  website?: string | null;
}

/** Website tab: scrape a lead's site into a saved page list, fetch per-page content. */
export default function WebsitePagesTab({ entity, leadId, website }: Props) {
  const variables = { entity_type: entity, lead_id: leadId };
  const { data, loading, error } = useQuery<{ crmWebsitePages: CrmWebsitePage[] }>(CRM_WEBSITE_PAGES, {
    variables,
    fetchPolicy: 'cache-and-network',
  });
  const [scrapeMut, { loading: scraping }] = useMutation(SCRAPE_CRM_WEBSITE_PAGES, {
    refetchQueries: [{ query: CRM_WEBSITE_PAGES, variables }],
  });
  const [deleteMut, { loading: deleting }] = useMutation(DELETE_CRM_WEBSITE_PAGE, {
    refetchQueries: [{ query: CRM_WEBSITE_PAGES, variables }],
  });

  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [viewing, setViewing] = useState<CrmWebsitePage | null>(null);
  const [removing, setRemoving] = useState<CrmWebsitePage | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pages = data?.crmWebsitePages ?? [];

  if (!website) {
    return (
      <Alert severity="info">
        No website on record for this lead. Open <strong>Edit</strong> and add a website to scrape its pages.
      </Alert>
    );
  }

  const doScrape = async (limit: number) => {
    setActionError(null);
    try {
      await scrapeMut({ variables: { ...variables, limit } });
      setScrapeOpen(false);
    } catch (err) {
      setActionError(parseApiError(err));
    }
  };

  const confirmDelete = async () => {
    if (!removing) return;
    try {
      await deleteMut({ variables: { id: removing.id } });
    } catch (err) {
      setActionError(parseApiError(err));
    }
    setRemoving(null);
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
            <LanguageIcon color="primary" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800}>Website</Typography>
              <ExternalLink variant="body2" href={website} />
            </Box>
            <Chip size="small" variant="outlined" label={`${pages.length} page${pages.length === 1 ? '' : 's'} saved`} />
            <Button variant="contained" startIcon={<TravelExploreIcon />} onClick={() => { setActionError(null); setScrapeOpen(true); }}>
              Scrape pages
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {actionError && <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert>}

      <Card>
        <CardContent>
          {loading && pages.length === 0 ? (
            <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
          ) : pages.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No pages yet. Click "Scrape pages" to discover and save this website's pages.
            </Typography>
          ) : (
            <WebsitePagesTable pages={pages} onView={setViewing} onDelete={setRemoving} onError={setActionError} />
          )}
        </CardContent>
      </Card>

      <ScrapeDialog open={scrapeOpen} website={website} loading={scraping} onClose={() => setScrapeOpen(false)} onConfirm={doScrape} />
      <PageContentDialog page={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={!!removing}
        title="Delete page"
        message={`Remove "${removing?.url ?? ''}" from the saved pages?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setRemoving(null)}
      />
    </Stack>
  );
}
