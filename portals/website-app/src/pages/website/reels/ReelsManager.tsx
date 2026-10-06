import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm, notifyError } from '@duncit/dialogs';
import { useApolloTableFetch } from '@duncit/table';
import { firstGraphQLError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { WebsiteNavSite } from '@duncit/gql-types';
import { ReelForm, toReelInput, type ReelFormOutput } from './reel-form';
import ReelsTable from './ReelsTable';
import {
  CREATE_WEBSITE_REEL,
  DELETE_WEBSITE_REEL,
  UPDATE_WEBSITE_REEL,
  WEBSITE_REEL_SETTINGS,
  WEBSITE_REELS_TABLE,
  type WebsiteReelRow,
  type WebsiteReelSettingsData,
} from './queries';

/** The reels one website's home page plays — shared by the Reel Slider page and a website's Reels tab. */
export default function ReelsManager({ site }: Readonly<{ site: WebsiteNavSite }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const refetchTable = () => refetchRef.current?.();
  const settings = useQuery<WebsiteReelSettingsData>(WEBSITE_REEL_SETTINGS);
  const maxMb = settings.data?.websiteReelSettings.max_reel_mb;
  const [createReel] = useMutation(CREATE_WEBSITE_REEL, { onCompleted: refetchTable });
  const [updateReel] = useMutation(UPDATE_WEBSITE_REEL, { onCompleted: refetchTable });
  const [deleteReel] = useMutation(DELETE_WEBSITE_REEL, { onCompleted: refetchTable });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteReelRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchRows = useApolloTableFetch<WebsiteReelRow>(
    client,
    WEBSITE_REELS_TABLE,
    'websiteReelsTable',
    { extraFilters: [{ field: 'site', op: 'eq', value: site }] },
    [site],
  );

  const openDialog = useCallback((reel: WebsiteReelRow | null) => {
    setEditing(reel);
    setSaveError(null);
    setDialogOpen(true);
  }, []);

  const askDelete = useCallback(
    async (reel: WebsiteReelRow) => {
      const ok = await confirm({
        title: t('websiteApp.reels.deleteTitle'),
        message: t('websiteApp.reels.deleteText', {
          vars: { title: reel.title || t('websiteApp.reels.untitled') },
        }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteReel({ variables: { id: reel.id } });
      } catch {
        notifyError(t('websiteApp.reels.deleteFailed'));
      }
    },
    [confirm, deleteReel, t],
  );

  const save = async (values: ReelFormOutput) => {
    const input = toReelInput(values, editing?.site ?? site);
    setSubmitting(true);
    setSaveError(null);
    try {
      if (editing) await updateReel({ variables: { id: editing.id, input } });
      else await createReel({ variables: { input } });
      setDialogOpen(false);
    } catch (err) {
      // A refused write (the slider is full, a bad link) explains itself; anything
      // else gets the console's own sentence rather than a transport message.
      const gqlError = firstGraphQLError(err);
      const isUserInput = gqlError?.extensions?.code === 'BAD_USER_INPUT';
      setSaveError(isUserInput && gqlError?.message ? gqlError.message : t('websiteApp.reels.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2}>
      {settings.error && <Alert severity="error">{t('websiteApp.reels.settings.loadFailed')}</Alert>}
      <ReelsTable
        key={site}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={maxMb === undefined}
            onClick={() => openDialog(null)}
          >
            {t('websiteApp.reels.add')}
          </DuncitButton>
        }
        onEdit={openDialog}
        onDelete={(reel) => {
          askDelete(reel).catch(() => notifyError(t('websiteApp.reels.deleteFailed')));
        }}
      />

      <Dialog open={dialogOpen && maxMb !== undefined} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? t('websiteApp.reels.dialogEdit') : t('websiteApp.reels.dialogAdd')}</DialogTitle>
        <DialogContent dividers>
          {maxMb !== undefined && (
            <ReelForm
              key={editing?.id ?? 'new'}
              reel={editing}
              maxMb={maxMb}
              submitting={submitting}
              errorMessage={saveError}
              onSubmit={(values) => {
                save(values).catch(() => setSaveError(t('websiteApp.reels.saveFailed')));
              }}
              onCancel={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
