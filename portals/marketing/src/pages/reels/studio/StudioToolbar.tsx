import { Chip, Stack, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import HistoryIcon from '@mui/icons-material/History';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InsightsIcon from '@mui/icons-material/Insights';
import RuleIcon from '@mui/icons-material/Rule';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { BackHeader } from '@duncit/ui';
import { formatReelDuration } from '../format';
import type { ReelCheck, ReelProject } from '../types';
import { checkTally } from './tools/useValidation';
import type { ToolDialog } from './tools/useStudioTools';

interface Props {
  project: ReelProject;
  /** The latest check result, for the chip. */
  checks: readonly ReelCheck[];
  onEditDetails: () => void;
  onTool: (kind: ToolDialog) => void;
  /** Makes the frame under the playhead the cover. */
  onCover: () => void;
  settingCover: boolean;
  onExport: () => Promise<void>;
}

/** The toolbar's chip about the checks: how they stand, or nothing until they have been run. */
function ChecksChip({ checks }: Readonly<{ checks: readonly ReelCheck[] }>) {
  const { t } = useTranslation();
  if (checks.length === 0) return null;
  const tally = checkTally(checks);
  const failed = tally.total - tally.passed;
  return (
    <Chip
      size="small"
      color={failed === 0 ? 'success' : 'warning'}
      variant="outlined"
      label={failed === 0 ? t('ai.reels.validate.chipPass') : t('ai.reels.validate.chipFail', { count: failed, vars: { count: failed } })}
      data-testid="reel-checks-chip"
    />
  );
}

/** The studio's top bar: which reel this is, how it stands, and every tool that acts on it as a whole. */
export default function StudioToolbar({ project, checks, onEditDetails, onTool, onCover, settingCover, onExport }: Readonly<Props>) {
  const { t } = useTranslation();
  const sceneCount = project.spec.scenes.length;
  const hasScenes = sceneCount > 0;

  return (
    <BackHeader
      title={project.name}
      titleVariant="h6"
      titleNoWrap
      backTo="/studio/reels"
      backAriaLabel={t('ai.reels.studio.back')}
      sx={{ px: 2, py: 1.25 }}
      actions={
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            variant="outlined"
            label={t('ai.reels.studio.summary', { count: sceneCount, vars: { length: formatReelDuration(project.duration_ms) } })}
            data-testid="reel-studio-summary"
          />
          <ChecksChip checks={checks} />
          {project.cover_at_ms !== null && (
            <Chip size="small" variant="outlined" label={t('ai.reels.cover.chip', { vars: { at: formatReelDuration(project.cover_at_ms) } })} data-testid="reel-cover-chip" />
          )}
          <DuncitButton size="small" startIcon={<EditOutlinedIcon />} onClick={onEditDetails} data-testid="reel-studio-edit-details">
            {t('ai.reels.studio.editDetails')}
          </DuncitButton>
          <DuncitButton size="small" startIcon={<RuleIcon />} disabled={!hasScenes} onClick={() => onTool('validate')} data-tour="studio-validate" data-testid="reel-studio-validate">
            {t('ai.reels.validate.open')}
          </DuncitButton>
          <DuncitButton size="small" startIcon={<ForumOutlinedIcon />} onClick={() => onTool('variants')} data-testid="reel-studio-variants">
            {t('ai.reels.variants.open')}
          </DuncitButton>
          <Tooltip title={t('ai.reels.cover.hint')}>
            <span>
              <DuncitButton size="small" startIcon={<ImageOutlinedIcon />} disabled={!hasScenes} loading={settingCover} onClick={onCover} data-testid="reel-studio-cover">
                {t('ai.reels.cover.open')}
              </DuncitButton>
            </span>
          </Tooltip>
          <DuncitButton size="small" startIcon={<HistoryIcon />} onClick={() => onTool('history')} data-testid="reel-studio-history">
            {t('ai.reels.history.open')}
          </DuncitButton>
          <DuncitButton size="small" startIcon={<InsightsIcon />} onClick={() => onTool('analytics')} data-testid="reel-studio-analytics">
            {t('ai.reels.analytics.open')}
          </DuncitButton>
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={!hasScenes}
            onClick={onExport}
            data-tour="studio-export"
            data-testid="reel-studio-export"
          >
            {t('ai.reels.studio.export')}
          </DuncitButton>
        </Stack>
      }
    />
  );
}
