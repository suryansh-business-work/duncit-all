import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import ManagersOnly from '../../components/ManagersOnly';
import SettingsEditor from './SettingsEditor';

/**
 * MCP Settings — managers only: the write kill switch, the switched-off
 * categories and tools, the default injection guard, token prices and the AI
 * apps Duncit trusts. Every change reaches every server within seconds.
 */
export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={3}>
      <PageHeader title={t('mcp.settings.title')} subtitle={t('mcp.settings.subtitle')} />
      <ManagersOnly>
        <SettingsEditor />
      </ManagersOnly>
    </Stack>
  );
}
