import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { TAB_PARAM } from '@duncit/tabs';

/**
 * The campaigns the Logs tab is narrowed to, comma-separated.
 *
 * In the URL beside `selectedtab` rather than in component state, for the same
 * reason the tab itself lives there: a narrowed view has to survive a reload
 * and be pasteable to somebody else. A campaign name is lowercase letters,
 * digits and underscores at AiSensy, so a comma never appears inside one.
 */
export const LOG_CAMPAIGN_PARAM = 'wacampaign';

export interface LogCampaignParam {
  /** The names in the URL now. Empty means the whole feed. */
  campaigns: string[];
  /** Open the Logs tab narrowed to these campaigns. */
  openLogsFor: (campaigns: readonly string[]) => void;
  /** Drop the narrowing and show everything again. */
  clear: () => void;
}

export function useLogCampaignParam(): LogCampaignParam {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(LOG_CAMPAIGN_PARAM) ?? '';

  const campaigns = useMemo(
    () => raw.split(',').map((name) => name.trim()).filter(Boolean),
    [raw]
  );

  // Both writes go in ONE `setSearchParams`. Two calls would each read the
  // query string THIS render closed over, and the second would land without the
  // first's change — the tab would move and the filter would not, or the other
  // way round. Replace, not push, so Back leaves the page rather than walking
  // through every count somebody pressed.
  const openLogsFor = useCallback(
    (names: readonly string[]) => {
      const params = new URLSearchParams(searchParams);
      params.set(TAB_PARAM, 'logs');
      params.set(LOG_CAMPAIGN_PARAM, names.join(','));
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clear = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete(LOG_CAMPAIGN_PARAM);
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  return { campaigns, openLogsFor, clear };
}
