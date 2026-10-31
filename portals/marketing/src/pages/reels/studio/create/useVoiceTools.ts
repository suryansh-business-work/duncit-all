import { useCallback, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import type { ReelSubtitlesFormValues } from '../../../../forms/reel-subtitles';
import type { ReelVoiceoverFormValues } from '../../../../forms/reel-voiceover';
import { GENERATE_REEL_SUBTITLES, GENERATE_REEL_VOICEOVER, REEL_PROJECT } from '../../queries';

/**
 * Speech, both ways: words spoken into a sound file the reel plays under
 * itself, and a sound file's words written onto the scenes as captions. Both
 * are made by the server and answer with the reel's id; the reel is refetched
 * and waited for, so the new voice or captions are on screen when the button
 * stops spinning.
 */
export function useVoiceTools(projectId: string) {
  const { t } = useTranslation();
  const refetch = useMemo(
    () => ({ refetchQueries: [{ query: REEL_PROJECT, variables: { id: projectId } }], awaitRefetchQueries: true }),
    [projectId]
  );
  const [voiceoverMutation, { loading: speaking }] = useMutation(GENERATE_REEL_VOICEOVER, refetch);
  const [subtitlesMutation, { loading: transcribing }] = useMutation(GENERATE_REEL_SUBTITLES, refetch);

  /** Answers true once the voiceover is in the reel. */
  const generateVoiceover = useCallback(
    async (values: ReelVoiceoverFormValues): Promise<boolean> => {
      try {
        await voiceoverMutation({ variables: { project_id: projectId, text: values.text, voice: values.voice, language: values.language } });
        notifySuccess(t('ai.reels.voice.generated'));
        return true;
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.voice.generateFailed')));
        return false;
      }
    },
    [projectId, t, voiceoverMutation]
  );

  /** Answers true once the subtitles are on the scenes. */
  const generateSubtitles = useCallback(
    async (values: ReelSubtitlesFormValues): Promise<boolean> => {
      try {
        await subtitlesMutation({ variables: { project_id: projectId, asset_id: values.asset_id, language: values.language } });
        notifySuccess(t('ai.reels.voice.subtitlesGenerated'));
        return true;
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.voice.subtitlesFailed')));
        return false;
      }
    },
    [projectId, subtitlesMutation, t]
  );

  return { generateVoiceover, speaking, generateSubtitles, transcribing };
}

export type VoiceTools = ReturnType<typeof useVoiceTools>;
