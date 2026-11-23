import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import LoginVerificationDrawer from './LoginVerificationDrawer';
import LoginVerificationsTable from './LoginVerificationsTable';
import { PORTAL_SECURITY_LOGS_TABLE, type LogRow } from './queries';

/**
 * Tech → Security → Login verifications: every Security Verification a person
 * completed, or refused, after signing in to a console.
 *
 * The list carries a masked address and a coarse place and nothing else about
 * where a person was. Opening a row reads the full record, and the server
 * writes down that you did — so a row is only fetched when it is opened, never
 * for the whole page and never on hover.
 */
export default function LoginVerificationsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const fetchRows = useApolloTableFetch<LogRow>(client, PORTAL_SECURITY_LOGS_TABLE, 'portalSecurityLogsTable');
  const open = useCallback((row: LogRow) => setOpenId(row.id), []);
  const close = useCallback(() => setOpenId(null), []);

  return (
    <Stack spacing={3}>
      <PageHeader title={t('tech.loginVerifications.title')} subtitle={t('tech.loginVerifications.subtitle')} />
      <LoginVerificationsTable fetchRows={fetchRows} onOpen={open} />
      <LoginVerificationDrawer id={openId} onClose={close} />
    </Stack>
  );
}
