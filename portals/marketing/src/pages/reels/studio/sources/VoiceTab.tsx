import { useMemo } from 'react';
import { Box, Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { ReelVoiceoverForm } from '../../../../forms/reel-voiceover';
import type { ReelProject } from '../../types';
import { useVoiceTools } from '../create/useVoiceTools';
import { languageOptions } from '../create/voices';
import { formatReelDuration } from '../../format';

interface Props {
  project: ReelProject;
}

/**
 * Voice: a voiceover written here and spoken by the server, and every
 * generated sound the reel already holds, each playable in place.
 */
export default function VoiceTab({ project }: Readonly<Props>) {
  const { t, locale, locales } = useTranslation();
  const tools = useVoiceTools(project.id);
  const languages = useMemo(() => languageOptions(locales), [locales]);
  const generated = useMemo(() => project.assets.filter((asset) => asset.source === 'GENERATED'), [project.assets]);

  return (
    <Stack sx={{ minHeight: 0, flex: 1, overflowY: 'auto' }} data-testid="reel-voice-tab">
      <Box sx={{ px: 1.5, pt: 1, pb: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          {t('ai.reels.voice.hint')}
        </Typography>
        <ReelVoiceoverForm languages={languages} defaultLanguage={locale} submitting={tools.speaking} onSubmit={tools.generateVoiceover} />
      </Box>
      <Divider />
      <Typography variant="subtitle2" component="h3" sx={{ px: 2, pt: 1.5, fontWeight: 700 }}>
        {t('ai.reels.voice.generatedTitle')}
      </Typography>
      {generated.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', px: 2, py: 1 }} data-testid="reel-voice-empty">
          {t('ai.reels.voice.generatedEmpty')}
        </Typography>
      ) : (
        <List dense disablePadding aria-label={t('ai.reels.voice.generatedTitle')} data-testid="reel-voice-list">
          {generated.map((asset) => (
            <ListItem key={asset.id} sx={{ display: 'block', py: 0.75 }} data-testid={`reel-voice-${asset.id}`}>
              <ListItemText
                primary={asset.name}
                secondary={asset.duration_ms > 0 ? formatReelDuration(asset.duration_ms) : undefined}
                slotProps={{ primary: { noWrap: true, variant: 'body2' }, secondary: { variant: 'caption' } }}
              />
              <Box component="audio" controls preload="none" src={asset.url} aria-label={t('ai.reels.voice.play', { vars: { name: asset.name } })} sx={{ width: '100%', mt: 0.5 }}>
                <track kind="captions" />
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}
