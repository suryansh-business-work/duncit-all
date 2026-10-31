import { useState } from 'react';
import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { HelpTip } from '@duncit/ui';
import type { ReelProject, ReelScript } from '../../types';
import AfterApply from './AfterApply';

interface Props {
  project: ReelProject;
  script: ReelScript;
  busy: boolean;
  applied: boolean;
  onApply: (autoMedia: boolean) => void;
}

/**
 * The last step of Create: put the script on the timeline — one scene per
 * line, with stock footage found for the scenes that have none when asked —
 * then offer the voice and the captions that finish it.
 */
export default function ApplyStep({ project, script, busy, applied, onApply }: Readonly<Props>) {
  const { t } = useTranslation();
  const [autoMedia, setAutoMedia] = useState(true);

  return (
    <Stack spacing={1.5} data-testid="reel-apply-step">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ai.reels.create.applyHint', { vars: { count: script.scenes.length } })}
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
        <FormControlLabel
          control={<Switch checked={autoMedia} onChange={(_event, checked) => setAutoMedia(checked)} data-testid="reel-apply-auto-media" />}
          label={t('ai.reels.create.autoMedia')}
        />
        <HelpTip title={t('ai.reels.create.autoMediaHint')} />
      </Stack>
      <DuncitButton
        variant="contained"
        startIcon={<PlayArrowIcon />}
        loading={busy}
        onClick={() => onApply(autoMedia)}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="reel-apply-submit"
      >
        {applied ? t('ai.reels.create.applyAgain') : t('ai.reels.create.apply')}
      </DuncitButton>
      {applied && <AfterApply project={project} script={script} />}
    </Stack>
  );
}
