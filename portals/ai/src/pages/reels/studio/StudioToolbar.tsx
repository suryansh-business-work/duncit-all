import { Chip, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { BackHeader } from '@duncit/ui';
import { formatReelDuration } from '../format';
import type { ReelProject } from '../types';

interface Props {
  project: ReelProject;
  onEditDetails: () => void;
  onExport: () => Promise<void>;
}

/** The studio's top bar: which reel this is, how long it runs, and the way out as a file. */
export default function StudioToolbar({ project, onEditDetails, onExport }: Readonly<Props>) {
  const { t } = useTranslation();
  const sceneCount = project.spec.scenes.length;

  return (
    <BackHeader
      title={project.name}
      titleVariant="h6"
      titleNoWrap
      backTo="/reels"
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
          <DuncitButton size="small" startIcon={<EditOutlinedIcon />} onClick={onEditDetails} data-testid="reel-studio-edit-details">
            {t('ai.reels.studio.editDetails')}
          </DuncitButton>
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={sceneCount === 0}
            onClick={onExport}
            data-testid="reel-studio-export"
          >
            {t('ai.reels.studio.export')}
          </DuncitButton>
        </Stack>
      }
    />
  );
}
