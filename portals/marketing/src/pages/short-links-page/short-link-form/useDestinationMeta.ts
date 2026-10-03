import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { SHORT_LINK_DESTINATION_META, type ShortLinkDestinationMeta } from '../queries';
import { isAllowedDestination, isAllowedExternalDestination } from './short-link-destination';

export interface DestinationMetaState {
  /** False until the destination is a URL this form would accept. */
  ready: boolean;
  loading: boolean;
  meta: ShortLinkDestinationMeta | null;
  error: string | null;
}

/**
 * The card the destination publishes right now, re-read whenever the
 * destination settles on a new valid URL. Asked of the server rather than the
 * browser, which cannot read another site's HTML — and so that what is shown
 * here is what the link's real unfurl will be built from.
 */
export function useDestinationMeta(destination: string, external: boolean): DestinationMetaState {
  const { t } = useTranslation();
  const settled = useDebouncedValue(destination.trim(), 600);
  const ready = external ? isAllowedExternalDestination(settled) : isAllowedDestination(settled);
  const { data, loading, error } = useQuery<{ shortLinkDestinationMeta: ShortLinkDestinationMeta }>(
    SHORT_LINK_DESTINATION_META,
    { variables: { destination_url: settled }, skip: !ready, fetchPolicy: 'network-only' },
  );
  return {
    ready,
    loading: ready && loading,
    meta: ready ? (data?.shortLinkDestinationMeta ?? null) : null,
    error: ready && error ? parseApiError(error, t('marketing.shortLinks.couldNotReadDestination')) : null,
  };
}
