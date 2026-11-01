import { useCallback, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { GENERATE_REEL_VARIANTS, REEL_PROJECT } from '../../queries';
import type { SocialPlatform } from '../../../social-accounts-page/queries';

/**
 * Captions per network, written by the server and kept on the reel. The reel
 * is refetched and waited for, so the dialog's form is showing them when the
 * button stops spinning.
 */
export function useVariants(projectId: string) {
  const { t } = useTranslation();
  const refetch = useMemo(
    () => ({ refetchQueries: [{ query: REEL_PROJECT, variables: { id: projectId } }], awaitRefetchQueries: true }),
    [projectId]
  );
  const [mutation, { loading: generating }] = useMutation(GENERATE_REEL_VARIANTS, refetch);

  /** Answers true once the captions are on the reel. */
  const generate = useCallback(
    async (platforms: readonly SocialPlatform[]): Promise<boolean> => {
      try {
        await mutation({ variables: { project_id: projectId, platforms: [...platforms] } });
        notifySuccess(t('ai.reels.variants.generated'));
        return true;
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.variants.failed')));
        return false;
      }
    },
    [mutation, projectId, t]
  );

  return { generate, generating };
}

export type Variants = ReturnType<typeof useVariants>;
