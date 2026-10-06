import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { designVariables } from '@duncit/brand/cms-design';
import { CMS_SITE_DESIGN, type CmsSiteDesignData } from '../queries/sites';
import type { CodeToken } from '../components/code-field/CodeTokens';

/**
 * Every CSS variable a website declares — its design tokens and font roles —
 * for listing beside its stylesheets. Shares the Design tab's query, so it is
 * usually answered from the cache.
 */
export function useSiteTokens(siteId: string): CodeToken[] {
  const { data } = useQuery<CmsSiteDesignData>(CMS_SITE_DESIGN, { variables: { id: siteId }, skip: !siteId });
  const design = data?.cmsSite?.design;
  return useMemo(() => (design ? designVariables(design.tokens, design.fonts) : []), [design]);
}
