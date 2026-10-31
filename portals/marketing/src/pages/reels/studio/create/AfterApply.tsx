import { useMemo, useState } from 'react';
import { Collapse, Divider, Stack, Typography } from '@mui/material';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import SubtitlesIcon from '@mui/icons-material/Subtitles';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { ReelSubtitlesForm } from '../../../../forms/reel-subtitles';
import { ReelVoiceoverForm } from '../../../../forms/reel-voiceover';
import type { ReelProject, ReelScript } from '../../types';
import { scriptNarration } from './briefText';
import { useVoiceTools } from './useVoiceTools';
import { languageOptions } from './voices';

interface Props {
  project: ReelProject;
  script: ReelScript;
}

/** The sounds subtitles can be written from: generated speech, and clips that carry their own sound. */
export function subtitleSources(project: Pick<ReelProject, 'assets'>): { value: string; label: string }[] {
  return project.assets
    .filter((asset) => asset.source === 'GENERATED' || asset.kind === 'VIDEO')
    .map((asset) => ({ value: asset.id, label: asset.name }));
}

/**
 * Once the storyboard is on the timeline: a voiceover read from the script's
 * own lines, and subtitles written from it — or from any clip with sound.
 */
export default function AfterApply({ project, script }: Readonly<Props>) {
  const { t, locale, locales } = useTranslation();
  const tools = useVoiceTools(project.id);
  const languages = useMemo(() => languageOptions(locales), [locales]);
  const sources = useMemo(() => subtitleSources(project), [project]);
  const [open, setOpen] = useState<'voice' | 'subtitles' | null>(null);
  const toggle = (which: 'voice' | 'subtitles') => setOpen((current) => (current === which ? null : which));

  return (
    <Stack spacing={1.5} data-testid="reel-after-apply">
      <Divider />
      <Typography variant="subtitle2" component="h3">
        {t('ai.reels.create.finishTitle')}
      </Typography>
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        <DuncitButton size="small" variant="outlined" startIcon={<RecordVoiceOverIcon />} aria-expanded={open === 'voice'} onClick={() => toggle('voice')} data-testid="reel-offer-voiceover">
          {t('ai.reels.create.offerVoiceover')}
        </DuncitButton>
        <DuncitButton size="small" variant="outlined" startIcon={<SubtitlesIcon />} aria-expanded={open === 'subtitles'} onClick={() => toggle('subtitles')} data-testid="reel-offer-subtitles">
          {t('ai.reels.create.offerSubtitles')}
        </DuncitButton>
      </Stack>
      <Collapse in={open === 'voice'} unmountOnExit>
        <ReelVoiceoverForm
          initialText={scriptNarration(script.scenes)}
          languages={languages}
          defaultLanguage={locale}
          submitting={tools.speaking}
          onSubmit={tools.generateVoiceover}
        />
      </Collapse>
      <Collapse in={open === 'subtitles'} unmountOnExit>
        <ReelSubtitlesForm sources={sources} languages={languages} defaultLanguage={locale} submitting={tools.transcribing} onSubmit={tools.generateSubtitles} />
      </Collapse>
    </Stack>
  );
}
