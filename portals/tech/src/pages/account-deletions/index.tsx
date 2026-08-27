import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import AccountDeletionsTable from './AccountDeletionsTable';
import AccountDeletionDetailDialog from './AccountDeletionDetailDialog';
import DeletionSettingsDialog from './DeletionSettingsDialog';
import { ACCOUNT_DELETIONS_TABLE, type AccountDeletionRow } from './queries';

/**
 * Account Deletions — members who have asked to be removed.
 *
 * The apps used to delete on the spot. They no longer do: a deletion reaches
 * every collection a member appears in and cannot be undone, so the ask is
 * queued here and a person carries it out. Until they do, the member's account
 * works exactly as it did, and they can withdraw the request.
 */
export default function AccountDeletionsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [selected, setSelected] = useState<AccountDeletionRow | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fetchRows = useApolloTableFetch<AccountDeletionRow>(
    client,
    ACCOUNT_DELETIONS_TABLE,
    'accountDeletionRequestsTable'
  );

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="h5">{t('tech.accountDeletions.title')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('tech.accountDeletions.introSealed')}
          </Typography>
        </Box>
        <DuncitButton
          startIcon={<SettingsOutlinedIcon />}
          onClick={() => setSettingsOpen(true)}
          sx={{ textTransform: 'none', flexShrink: 0 }}
          data-testid="open-deletion-settings"
        >
          {t('tech.accountDeletions.settingsTitle')}
        </DuncitButton>
      </Stack>
      <AccountDeletionsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onOpen={setSelected}
      />
      <AccountDeletionDetailDialog
        row={selected}
        onClose={() => setSelected(null)}
        onChanged={() => refetchRef.current?.()}
      />
      <DeletionSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Stack>
  );
}
