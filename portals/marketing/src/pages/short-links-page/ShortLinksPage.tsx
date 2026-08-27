import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { getShortLinkColumns } from './columns';
import CreateShortLinkDialog from './CreateShortLinkDialog';
import {
  CAMPAIGNS_FOR_SHORT_LINK,
  DELETE_SHORT_LINK,
  SHORT_LINKS_TABLE,
  SHORT_LINK_OPTIONS,
  type CampaignChoice,
  type ShortLinkOptions,
  type ShortLinkRow,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

const getRowId = (row: ShortLinkRow) => row.id;
const NO_OPTIONS: ShortLinkOptions = { sources: [], mediums: [] };
// Stable empty array: a fresh [] each render would rebuild every column.
const NO_CAMPAIGNS: CampaignChoice[] = [];

/** Every duncit.com/<code> link, what it was made for, and how often it has
 * been followed. */
export default function ShortLinksPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);
  const [creating, setCreating] = useState(false);
  const [target, setTarget] = useState<ShortLinkRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteLink, { loading: deleting }] = useMutation(DELETE_SHORT_LINK);

  const { data: optionsData } = useQuery<{ shortLinkOptions: ShortLinkOptions }>(
    SHORT_LINK_OPTIONS,
  );
  const options = optionsData?.shortLinkOptions ?? NO_OPTIONS;
  // Names the campaign column and fills its filter — the share campaigns the
  // apps mint into included, which is most of what this table now holds.
  const { data: campaignsData } = useQuery<{ shortLinkCampaigns: CampaignChoice[] }>(
    CAMPAIGNS_FOR_SHORT_LINK,
  );
  const campaigns = campaignsData?.shortLinkCampaigns ?? NO_CAMPAIGNS;

  const fetchRows = useApolloTableFetch<ShortLinkRow>(client, SHORT_LINKS_TABLE, 'shortLinksTable');

  // Opening a link is a page, not a dialog: it carries a chart, six
  // breakdowns and a paged table of every click.
  const openLink = useCallback(
    (link: ShortLinkRow) => navigate(`/short-links/${link.id}`),
    [navigate],
  );

  const columns = useMemo(
    () =>
      getShortLinkColumns({
        sources: options.sources,
        mediums: options.mediums,
        campaigns,
        onView: openLink,
        onDelete: setTarget,
      }, t),
    [t, campaigns, openLink, options],
  );

  const refresh = useCallback(() => refetchRef.current?.(), []);

  const confirmDelete = async (link: ShortLinkRow) => {
    setError(null);
    try {
      await deleteLink({ variables: { id: link.id } });
    } catch (e) {
      setError(parseApiError(e, 'Could not delete the link'));
      return;
    }
    notifySuccess(`“${link.label}” deleted`);
    setTarget(null);
    refresh();
  };

  const closeConfirm = () => {
    setTarget(null);
    setError(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "flex-start",
          mb: 2
        }}>
        <Stack spacing={0.25} sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Short Links
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            One duncit.com link per channel. Each one tags its destination so you can tell where a
            visitor came from.
          </Typography>
        </Stack>
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
          New short link
        </DuncitButton>
      </Stack>

      <DuncitTable<ShortLinkRow>
        tableId="marketing-short-links"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={openLink}
        refetchRef={refetchRef}
        emptyText={t('marketing.shortLinks.noShortLinksYetCreateOne')}
        searchPlaceholder="Search by label, code or destination"
        defaultSort={{ field: 'created_at', dir: 'desc' }}
      />

      {creating && (
        <CreateShortLinkDialog
          options={options}
          onClose={() => setCreating(false)}
          onCreated={(link) => {
            setCreating(false);
            navigate(`/short-links/${link.id}`);
          }}
        />
      )}

      {/* Rendered only once a link is picked, so confirming needs no null
          guard for a state the dialog cannot be open in. */}
      {target && (
        <ConfirmDialog
          open
          title={t('marketing.shortLinks.deleteThisShortLink')}
          message={
            error ??
            `“${target.label}” stops working immediately — anywhere it is already printed or posted will 404. Retire it instead if you only want to stop new traffic.`
          }
          confirmLabel={t('shell.common.delete')}
          confirmColor="error"
          loading={deleting}
          busyLabel="Deleting…"
          onClose={closeConfirm}
          onConfirm={() => confirmDelete(target)}
        />
      )}
    </Box>
  );
}
