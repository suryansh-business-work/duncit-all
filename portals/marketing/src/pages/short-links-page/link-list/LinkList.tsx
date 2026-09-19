import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { getShortLinkColumns } from '../columns';
import CreateShortLinkDialog from '../CreateShortLinkDialog';
import {
  CAMPAIGNS_FOR_SHORT_LINK,
  DELETE_SHORT_LINK,
  SHORT_LINKS_TABLE,
  SHORT_LINK_OPTIONS,
  type CampaignChoice,
  type ShortLinkOptions,
  type ShortLinkRow,
} from '../queries';
import { VARIANTS, type LinkListVariant } from './variants';

const getRowId = (row: ShortLinkRow) => row.id;
const NO_OPTIONS: ShortLinkOptions = { sources: [], mediums: [] };
// Stable empty array: a fresh [] each render would rebuild every column.
const NO_CAMPAIGNS: CampaignChoice[] = [];

interface Props {
  variant: LinkListVariant;
}

/** A table of short links, with create and delete — the whole of both lists. */
export default function LinkList({ variant }: Readonly<Props>) {
  const config = VARIANTS[variant];
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);
  const [creating, setCreating] = useState(false);
  const [target, setTarget] = useState<ShortLinkRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteLink, { loading: deleting }] = useMutation<any>(DELETE_SHORT_LINK);

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

  const fetchRows = useApolloTableFetch<ShortLinkRow>(
    client,
    SHORT_LINKS_TABLE,
    'shortLinksTable',
    { extraFilters: config.extraFilters },
    [config.extraFilters],
  );

  // Opening a link is a page, not a dialog: it carries a chart, seven
  // breakdowns and a paged table of every click.
  const openLink = useCallback(
    (link: ShortLinkRow) => navigate(`${config.basePath}/${link.id}`),
    [navigate, config.basePath],
  );

  const columns = useMemo(
    () =>
      getShortLinkColumns(
        {
          sources: options.sources,
          mediums: options.mediums,
          campaigns,
          showDestination: config.showDestination,
          onView: openLink,
          onDelete: setTarget,
        },
        t,
      ),
    [t, campaigns, openLink, options, config.showDestination],
  );

  const confirmDelete = async (link: ShortLinkRow) => {
    setError(null);
    try {
      await deleteLink({ variables: { id: link.id } });
    } catch (e) {
      setError(parseApiError(e, t(config.keys.couldNotDelete)));
      return;
    }
    notifySuccess(t(config.keys.deleted, { vars: { label: link.label } }));
    setTarget(null);
    refetchRef.current?.();
  };

  const closeConfirm = () => {
    setTarget(null);
    setError(null);
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 2 }}>
        <DuncitButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreating(true)}
          data-testid={config.testId}
        >
          {t(config.keys.create)}
        </DuncitButton>
      </Stack>

      <DuncitTable<ShortLinkRow>
        ariaLabel={t(config.keys.label)}
        tableId={config.tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={openLink}
        refetchRef={refetchRef}
        emptyText={t(config.keys.empty)}
        searchPlaceholder={t('marketing.shortLinks.searchLinks')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
      />

      {creating && (
        <CreateShortLinkDialog
          options={options}
          external={config.external}
          onClose={() => setCreating(false)}
          onCreated={(link) => {
            setCreating(false);
            navigate(`${config.basePath}/${link.id}`);
          }}
        />
      )}

      {/* Rendered only once a link is picked, so confirming needs no null
          guard for a state the dialog cannot be open in. */}
      {target && (
        <ConfirmDialog
          open
          title={t(config.keys.deleteTitle)}
          message={error ?? t(config.keys.deleteMessage, { vars: { label: target.label } })}
          confirmLabel={t('shell.common.delete')}
          confirmColor="error"
          loading={deleting}
          busyLabel={t('marketing.shortLinks.deleting')}
          onClose={closeConfirm}
          onConfirm={() => confirmDelete(target)}
        />
      )}
    </Box>
  );
}
