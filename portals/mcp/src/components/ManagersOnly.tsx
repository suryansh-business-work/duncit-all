import type { ReactNode } from 'react';
import { Alert, AlertTitle } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { useIsMcpManager } from '../lib/roles';

/**
 * A managers-only page. Anyone else who opens it directly — a bookmark, a
 * shared link — reads why it is closed to them instead of a broken form; the
 * server refuses them the data either way.
 */
export default function ManagersOnly({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  const manager = useIsMcpManager();
  if (manager) return <>{children}</>;
  return (
    <Alert severity="info" data-testid="mcp-managers-only">
      <AlertTitle>{t('mcp.common.managersOnlyTitle')}</AlertTitle>
      {t('mcp.common.managersOnlyBody')}
    </Alert>
  );
}
