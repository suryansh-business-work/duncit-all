import { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { EmptyState } from '@duncit/ui';
import { ReelVariantsForm } from '../../../../forms/reel-variants';
import type { SocialPlatform } from '../../../social-accounts-page/queries';
import type { ReelProject, ReelVariant } from '../../types';
import PlatformPicker from './PlatformPicker';
import { useVariants } from './useVariants';

interface Props {
  open: boolean;
  onClose: () => void;
  project: ReelProject;
  /** Hands one network's caption to the post about to be made. */
  onUse: (variant: ReelVariant) => void;
}

/**
 * Per-network captions: pick the networks, have them written, tune each one,
 * and hand the one you are posting with to the composer. What the server
 * wrote stays on the reel; what is typed here goes with the post.
 */
export default function VariantsDialog({ open, onClose, project, onUse }: Readonly<Props>) {
  const { t } = useTranslation();
  const variants = useVariants(project.id);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(() => project.variants.map((variant) => variant.platform));

  const use = (variant: ReelVariant) => {
    onUse(variant);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="reel-variants-title" data-testid="reel-variants-dialog">
      <DialogTitle id="reel-variants-title">{t('ai.reels.variants.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('ai.reels.variants.hint')}
          </Typography>
          <PlatformPicker label={t('ai.reels.variants.platforms')} value={platforms} onChange={setPlatforms} disabled={variants.generating} />
          <DuncitButton
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            loading={variants.generating}
            disabled={platforms.length === 0}
            onClick={() => variants.generate(platforms)}
            sx={{ alignSelf: 'flex-start' }}
            data-testid="reel-variants-generate"
          >
            {project.variants.length > 0 ? t('ai.reels.variants.generateAgain') : t('ai.reels.variants.generate')}
          </DuncitButton>
          {project.variants.length > 0 ? (
            <ReelVariantsForm variants={project.variants} onUse={use} />
          ) : (
            <EmptyState compact icon={<ForumOutlinedIcon />} title={t('ai.reels.variants.emptyTitle')} body={t('ai.reels.variants.emptyBody')} data-testid="reel-variants-empty" />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} data-testid="reel-variants-close">
          {t('shell.common.close')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
