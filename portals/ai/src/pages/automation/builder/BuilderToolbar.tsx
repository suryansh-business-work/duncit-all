import { Chip, Stack, TextField, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { FLOW_STATUS_KEYS } from '../node-kinds';
import type { FlowStatus } from '../types';

export type SidePanelKind = 'inspector' | 'test' | 'runs';

interface Props {
  name: string;
  status: FlowStatus;
  issueCount: number;
  dirty: boolean;
  saving: boolean;
  changingStatus: boolean;
  panel: SidePanelKind;
  onNameChange: (name: string) => void;
  onBack: () => void;
  onSave: () => void;
  onToggleActive: () => void;
  onRunNow: () => void;
  onPanel: (panel: SidePanelKind) => void;
}

const STATUS_COLORS = { DRAFT: 'default', ACTIVE: 'success', PAUSED: 'warning' } as const;

/** The strip above the canvas: the flow's name and state, and everything one does to a flow as a whole. */
export default function BuilderToolbar({
  name,
  status,
  issueCount,
  dirty,
  saving,
  changingStatus,
  panel,
  onNameChange,
  onBack,
  onSave,
  onToggleActive,
  onRunNow,
  onPanel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const active = status === 'ACTIVE';
  const issueLabel = issueCount ? t('ai.automation.builder.issues', { vars: { count: issueCount } }) : t('ai.automation.builder.noIssues');

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1, px: 1.5, py: 1 }} data-testid="automation-toolbar">
      <Tooltip title={t('ai.automation.builder.back')}>
        <span>
          <DuncitIconButton aria-label={t('ai.automation.builder.back')} onClick={onBack} data-testid="automation-back">
            <ArrowBackIcon />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <TextField
        size="small"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        label={t('ai.automation.builder.nameLabel')}
        error={!name.trim()}
        helperText={name.trim() ? undefined : t('ai.automation.builder.nameRequired')}
        sx={{ minWidth: 240 }}
        slotProps={{ htmlInput: { 'data-testid': 'automation-flow-name-field', maxLength: 80 } }}
      />
      <StatusChip size="small" status={status} colorMap={STATUS_COLORS} label={t(FLOW_STATUS_KEYS[status])} />
      <Tooltip title={t('ai.automation.builder.issuesTitle')}>
        <Chip size="small" variant="outlined" color={issueCount ? 'error' : 'success'} label={issueLabel} data-testid="automation-issues" />
      </Tooltip>
      {dirty && <Chip size="small" color="warning" variant="outlined" label={t('ai.automation.builder.unsaved')} />}

      <Stack direction="row" spacing={1} sx={{ ml: 'auto', flexWrap: 'wrap', rowGap: 1 }}>
        <DuncitButton
          variant={panel === 'runs' ? 'contained' : 'outlined'}
          size="small"
          startIcon={<HistoryIcon />}
          onClick={() => onPanel(panel === 'runs' ? 'inspector' : 'runs')}
          aria-pressed={panel === 'runs'}
          data-testid="automation-runs-toggle"
        >
          {t('ai.automation.builder.runs')}
        </DuncitButton>
        <DuncitButton variant="outlined" size="small" startIcon={<SendIcon />} onClick={onRunNow} disabled={dirty} data-testid="automation-run-now">
          {t('ai.automation.builder.runNow')}
        </DuncitButton>
        <DuncitButton
          variant={panel === 'test' ? 'contained' : 'outlined'}
          size="small"
          startIcon={<ChatIcon />}
          onClick={() => onPanel(panel === 'test' ? 'inspector' : 'test')}
          aria-pressed={panel === 'test'}
          data-testid="automation-test-toggle"
        >
          {t('ai.automation.builder.test')}
        </DuncitButton>
        <DuncitButton
          variant="outlined"
          size="small"
          color={active ? 'warning' : 'primary'}
          startIcon={active ? <PauseIcon /> : <PlayArrowIcon />}
          onClick={onToggleActive}
          disabled={changingStatus || dirty}
          data-testid="automation-toggle-active"
        >
          {active ? t('ai.automation.builder.pause') : t('ai.automation.builder.activate')}
        </DuncitButton>
        <DuncitButton variant="contained" size="small" startIcon={<SaveIcon />} onClick={onSave} disabled={saving || !name.trim()} data-testid="automation-save">
          {saving ? t('ai.automation.builder.saving') : t('ai.automation.builder.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
