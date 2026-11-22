import { Stack, Switch, Tooltip } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { ToolRow } from '../shared/types';

interface Props {
  row: ToolRow;
  disabled: boolean;
  onAccess: (row: ToolRow, access: 'ALLOW' | 'BLOCK' | 'DEFAULT') => void;
  onApproval: (row: ToolRow, force: boolean) => void;
}

/**
 * Allowed for the role, and whether it waits for approval. Destructive,
 * confirm-gated and outward tools always wait — that switch cannot be turned off.
 */
export default function ToolAccessCell({ row, disabled, onAccess, onApproval }: Readonly<Props>) {
  const { t } = useTranslation();
  const forced = row.confirm || row.risk === 'DESTRUCTIVE' || row.outward;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Tooltip title={t('ai.askDuncit.tools.allowedTip')}>
        <Switch
          size="small"
          checked={row.allowed}
          disabled={disabled}
          slotProps={{ input: { 'aria-label': t('ai.askDuncit.tools.allowed') } }}
          onChange={(e) => onAccess(row, e.target.checked ? 'ALLOW' : 'BLOCK')}
        />
      </Tooltip>
      <Tooltip title={t(forced ? 'ai.askDuncit.tools.approvalForced' : 'ai.askDuncit.tools.approvalTip')}>
        <Switch
          size="small"
          color="warning"
          checked={row.approval_required}
          disabled={disabled || forced || row.risk === 'READ'}
          slotProps={{ input: { 'aria-label': t('ai.askDuncit.tools.approval') } }}
          onChange={(e) => onApproval(row, e.target.checked)}
        />
      </Tooltip>
    </Stack>
  );
}
