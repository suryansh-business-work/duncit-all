import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import FreeArrangementsTable from './FreeArrangementsTable';
import { FREE_ARRANGEMENTS_TABLE, type FreeArrangementRow } from './queries';

/**
 * Pods console › Free Arrangements. Free pods and free venues are allowed only
 * for initiatives, promotions and approved campaigns, so every one is listed
 * here with its host's justification and policy acceptance — Duncit monitors,
 * tracks and audits them from this page. Read-only, cancelled pods included.
 */
export default function FreeArrangementsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<FreeArrangementRow>(
    client,
    FREE_ARRANGEMENTS_TABLE,
    'adminFreeArrangementsTable',
  );

  return (
    <Stack spacing={2.5}>
      <PageHeader title={t('admin.freeArrangements.title')} subtitle={t('admin.freeArrangements.subtitle')} />
      <FreeArrangementsTable fetchRows={fetchRows} />
    </Stack>
  );
}
